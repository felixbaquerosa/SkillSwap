<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\App;
use App\Models\AiLog;

/**
 * Thin client for Google's Gemini API (generativelanguage.googleapis.com).
 * Every call is recorded in ai_logs. When no API key is configured, callers
 * fall back to deterministic logic so the app keeps working offline.
 */
final class GeminiService
{
    public static function isConfigured(): bool
    {
        return self::apiKey() !== '';
    }

    /** Last HTTP status from the most recent model attempt. */
    private static ?int $lastHttpCode = null;

    /** Best failure to surface to the user (429 beats 404). */
    private static ?int $bestFailureCode = null;

    public static function lastHttpCode(): ?int
    {
        return self::$bestFailureCode ?? self::$lastHttpCode;
    }

    private static function apiKey(): string
    {
        return (string) (App::config('gemini')['api_key'] ?? '');
    }

    private static function model(): string
    {
        return (string) (App::config('gemini')['model'] ?? 'gemini-2.0-flash-lite');
    }

    /**
     * Models to try in order (configured model first, then fallbacks).
     *
     * @return list<string>
     */
    private static function modelsToTry(): array
    {
        $preferred = self::model();
        $fallbacks = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];
        $ordered = array_values(array_unique(array_merge([$preferred], $fallbacks)));
        return $ordered;
    }

    /**
     * Low-level text generation. Tries multiple Gemini models if one fails (404/429).
     * Returns the model's text, or null on failure.
     */
    public static function generate(string $prompt, ?int $userId, string $feature): ?string
    {
        if (!self::isConfigured()) {
            self::$lastHttpCode = null;
            AiLog::record($userId, $feature, $prompt, '', 'no_key');
            return null;
        }

        self::$lastHttpCode = null;
        self::$bestFailureCode = null;

        foreach (self::modelsToTry() as $model) {
            $result = self::generateWithModel($prompt, $userId, $feature, $model);
            if ($result !== null) {
                return $result;
            }
            if (self::$lastHttpCode === 429) {
                self::$bestFailureCode = 429;
            } elseif (self::$bestFailureCode === null && self::$lastHttpCode !== null) {
                self::$bestFailureCode = self::$lastHttpCode;
            }
            if (self::$lastHttpCode !== 404 && self::$lastHttpCode !== 429) {
                break;
            }
        }

        return null;
    }

    private static function generateWithModel(string $prompt, ?int $userId, string $feature, string $model): ?string
    {
        $apiKey = self::apiKey();
        $url = sprintf(
            'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent',
            rawurlencode($model)
        );

        $payload = json_encode([
            'contents' => [
                ['parts' => [['text' => $prompt]]],
            ],
            'generationConfig' => [
                'temperature' => 0.6,
                'maxOutputTokens' => 1024,
            ],
        ]);

        // New AQ.* auth keys work best via x-goog-api-key header (Google's current format).
        // Legacy AIza* keys also accept ?key= on the URL — we send the header for both.
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'x-goog-api-key: ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 20,
        ]);
        $raw = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($raw === false || $httpCode < 200 || $httpCode >= 300) {
            self::$lastHttpCode = $httpCode;
            AiLog::record(
                $userId,
                $feature,
                $prompt,
                ($curlError !== '' ? $curlError : (string) $raw) . " [model={$model}]",
                'http_' . $httpCode
            );
            return null;
        }

        self::$lastHttpCode = 200;

        $decoded = json_decode((string) $raw, true);
        $text = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? null;
        if (!is_string($text) || $text === '') {
            AiLog::record($userId, $feature, $prompt, (string) $raw, 'empty');
            return null;
        }

        AiLog::record($userId, $feature, $prompt, $text, 'ok');
        return trim($text);
    }

    /** Whether the last assistant call used the built-in fallback. */
    private static bool $assistantUsedFallback = false;

    public static function assistantUsedFallback(): bool
    {
        return self::$assistantUsedFallback;
    }

    /**
     * In-app assistant scoped to skill-swapping help.
     */
    public static function assistant(string $userMessage, ?int $userId): string
    {
        self::$assistantUsedFallback = false;

        if (self::isConfigured()) {
            $prompt = "You are SkillSwap Assistant, a friendly helper inside a peer-to-peer skill-bartering app "
                . "where people trade skills (e.g. 'I teach guitar, you teach me coding') without money. "
                . "Answer concisely and practically. If asked something unrelated, gently steer back to skill swapping.\n\n"
                . "User: {$userMessage}";

            $reply = self::generate($prompt, $userId, 'assistant');
            if ($reply !== null) {
                return $reply;
            }
        }

        self::$assistantUsedFallback = true;
        AiLog::record($userId, 'assistant', $userMessage, '(fallback)', self::isConfigured() ? 'fallback' : 'no_key');

        return AssistantFallback::reply($userMessage, $userId);
    }

    /**
     * Re-rank candidate partners and attach a short reason to each.
     * Falls back to the deterministic order with generated reasons.
     *
     * @param array<int, array<string, mixed>> $candidates
     * @param array{offer: array<int,string>, want: array<int,string>} $viewerSkills
     * @return array<int, array<string, mixed>>
     */
    public static function rankMatches(array $candidates, array $viewerSkills, ?int $userId): array
    {
        if ($candidates === []) {
            return [];
        }

        if (self::isConfigured()) {
            $ranked = self::aiRank($candidates, $viewerSkills, $userId);
            if ($ranked !== null) {
                return $ranked;
            }
        }

        // Deterministic fallback: keep score order, synthesize a reason.
        return array_map(static function (array $c): array {
            $c['reason'] = self::fallbackReason($c);
            return $c;
        }, $candidates);
    }

    /**
     * @param array<int, array<string, mixed>> $candidates
     * @param array{offer: array<int,string>, want: array<int,string>} $viewerSkills
     * @return array<int, array<string, mixed>>|null
     */
    private static function aiRank(array $candidates, array $viewerSkills, ?int $userId): ?array
    {
        $iOffer = implode(', ', $viewerSkills['offer']) ?: '(none yet)';
        $iWant = implode(', ', $viewerSkills['want']) ?: '(none yet)';

        $list = [];
        foreach ($candidates as $c) {
            $list[] = [
                'user_id' => $c['user_id'],
                'name' => $c['user_name'],
                'they_offer_that_i_want' => $c['they_offer'],
                'they_want_that_i_offer' => $c['they_want'],
                'base_score' => $c['score'],
            ];
        }

        $prompt = "You match people for two-way skill swaps. I can teach: {$iOffer}. I want to learn: {$iWant}.\n"
            . "Here are candidate partners as JSON:\n" . json_encode($list) . "\n\n"
            . "Return ONLY a JSON array (no markdown), ordered best-first, where each item is "
            . "{\"user_id\": number, \"reason\": \"one short sentence on why this is a good swap\"}.";

        $text = self::generate($prompt, $userId, 'match-suggestions');
        if ($text === null) {
            return null;
        }

        // Strip code fences if the model added them.
        $clean = trim(preg_replace('/^```(json)?|```$/m', '', $text) ?? $text);
        $parsed = json_decode($clean, true);
        if (!is_array($parsed)) {
            return null;
        }

        $byId = [];
        foreach ($candidates as $c) {
            $byId[(int) $c['user_id']] = $c;
        }

        $ordered = [];
        foreach ($parsed as $item) {
            $uid = (int) ($item['user_id'] ?? 0);
            if (isset($byId[$uid])) {
                $row = $byId[$uid];
                $row['reason'] = (string) ($item['reason'] ?? self::fallbackReason($row));
                $ordered[] = $row;
                unset($byId[$uid]);
            }
        }
        // Append any the model dropped, preserving them.
        foreach ($byId as $row) {
            $row['reason'] = self::fallbackReason($row);
            $ordered[] = $row;
        }

        return $ordered;
    }

    /**
     * @param array<string, mixed> $c
     */
    private static function fallbackReason(array $c): string
    {
        $offer = is_array($c['they_offer'] ?? null) ? $c['they_offer'] : [];
        $want = is_array($c['they_want'] ?? null) ? $c['they_want'] : [];

        if ($offer !== [] && $want !== []) {
            return 'Great two-way swap: they can teach you ' . implode(', ', $offer)
                . ', and want to learn ' . implode(', ', $want) . ' from you.';
        }
        if ($offer !== []) {
            return 'They can teach you ' . implode(', ', $offer) . '.';
        }
        if ($want !== []) {
            return 'They want to learn ' . implode(', ', $want) . ' from you.';
        }
        return 'Potential skill-swap partner.';
    }
}
