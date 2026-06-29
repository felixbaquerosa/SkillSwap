<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database;

/**
 * Deterministic skill-barter matching. For a viewer, a strong partner both
 * offers skills the viewer wants AND wants skills the viewer offers (a true
 * two-way swap). This powers /discover and is the fallback when no Gemini
 * key is configured.
 */
final class MatchingService
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function candidates(int $userId, int $limit = 20): array
    {
        $mine = self::skillSets($userId);
        $myWants = $mine['want'];
        $myOffers = $mine['offer'];

        // Pull all other active users' skills in one query.
        $rows = Database::all(
            "SELECT us.user_id, us.type, us.skill_id, s.name AS skill_name, u.name AS user_name,
                    u.location, u.bio
             FROM user_skills us
             JOIN skills s ON s.id = us.skill_id
             JOIN users u ON u.id = us.user_id
             WHERE us.user_id <> ? AND u.is_active = 1 AND us.is_active = 1",
            [$userId]
        );

        /** @var array<int, array<string, mixed>> $byUser */
        $byUser = [];
        foreach ($rows as $r) {
            $uid = (int) $r['user_id'];
            if (!isset($byUser[$uid])) {
                $byUser[$uid] = [
                    'user_id' => $uid,
                    'user_name' => (string) $r['user_name'],
                    'location' => (string) ($r['location'] ?? ''),
                    'bio' => (string) ($r['bio'] ?? ''),
                    'offer' => [],
                    'want' => [],
                    'offer_names' => [],
                    'want_names' => [],
                ];
            }
            $type = (string) $r['type'];
            $byUser[$uid][$type][(int) $r['skill_id']] = true;
            $byUser[$uid][$type . '_names'][(int) $r['skill_id']] = (string) $r['skill_name'];
        }

        $results = [];
        foreach ($byUser as $cand) {
            // Skills they offer that I want.
            $theyOfferIWant = array_intersect_key($cand['offer_names'], $myWants);
            // Skills they want that I offer.
            $theyWantIOffer = array_intersect_key($cand['want_names'], $myOffers);

            $a = count($theyOfferIWant);
            $b = count($theyWantIOffer);
            if ($a === 0 && $b === 0) {
                continue;
            }

            $mutual = $a > 0 && $b > 0;
            // Score: reward both directions, with a strong bonus for a true
            // two-way swap. Capped at 100.
            $score = ($a * 20) + ($b * 20) + ($mutual ? 30 : 0);
            $score = (float) min(100, $score);

            $results[] = [
                'user_id' => $cand['user_id'],
                'user_name' => $cand['user_name'],
                'location' => $cand['location'],
                'bio' => $cand['bio'],
                'score' => $score,
                'mutual' => $mutual,
                'they_offer' => array_values($theyOfferIWant),
                'they_want' => array_values($theyWantIOffer),
            ];
        }

        usort($results, static fn ($x, $y) => $y['score'] <=> $x['score']);
        return array_slice($results, 0, $limit);
    }

    /**
     * Viewer's offered/wanted skill id sets keyed by skill id.
     *
     * @return array{offer: array<int, true>, want: array<int, true>}
     */
    private static function skillSets(int $userId): array
    {
        $rows = Database::all(
            'SELECT type, skill_id FROM user_skills WHERE user_id = ? AND is_active = 1',
            [$userId]
        );
        $sets = ['offer' => [], 'want' => []];
        foreach ($rows as $r) {
            $sets[(string) $r['type']][(int) $r['skill_id']] = true;
        }
        return $sets;
    }
}
