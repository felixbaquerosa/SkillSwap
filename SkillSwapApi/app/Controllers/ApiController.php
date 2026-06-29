<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiAuth;
use App\Core\Controller;
use App\Models\AiLog;
use App\Models\Message;
use App\Models\Skill;
use App\Models\SwapMatch;
use App\Models\SwapRating;
use App\Models\SwapSession;
use App\Models\User;
use App\Models\UserSkill;
use App\Services\GeminiService;
use App\Services\MatchingService;
use App\Models\UserMatchPrefs;
use App\Support\UserPresence;

/**
 * Single entry point for all SkillSwap mobile API endpoints.
 */
final class ApiController extends Controller
{
    // ---- Health -----------------------------------------------------------

    public function health(): void
    {
        $this->json([
            'app' => 'SkillSwap API',
            'status' => 'ok',
            'ai' => GeminiService::isConfigured() ? 'gemini' : 'fallback',
            'time' => date('c'),
        ]);
    }

    // ---- Auth -------------------------------------------------------------

    public function register(): void
    {
        $body = $this->body();
        $name = trim((string) ($body['name'] ?? ''));
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $location = trim((string) ($body['location'] ?? ''));
        $birthdate = trim((string) ($body['birthdate'] ?? ''));

        if ($name === '' || $email === '' || $password === '') {
            $this->json(['error' => 'Name, email, and password are required.'], 422);
            return;
        }
        $birthdateError = AgeGate::validateBirthdate($birthdate);
        if ($birthdateError !== null) {
            $this->json(['error' => $birthdateError], 422);
            return;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->json(['error' => 'Please enter a valid email address.'], 422);
            return;
        }
        if (strlen($password) < 8) {
            $this->json(['error' => 'Password must be at least 8 characters.'], 422);
            return;
        }
        if (User::emailExists($email)) {
            $this->json(['error' => 'That email is already registered.'], 422);
            return;
        }

        $userId = User::create($name, $email, $password, $birthdate, $location !== '' ? $location : null);
        $user = User::find($userId);
        if ($user === null) {
            $this->json(['error' => 'Registration failed.'], 500);
            return;
        }

        $token = ApiAuth::issue($userId);
        $this->json(['token' => $token, 'user' => User::payload($user)], 201);
    }

    public function login(): void
    {
        $body = $this->body();
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        if ($email === '' || $password === '') {
            $this->json(['error' => 'Email and password are required.'], 422);
            return;
        }

        $user = User::findByEmail($email);
        if ($user === null || !password_verify($password, (string) $user['password'])) {
            $this->json(['error' => 'Invalid email or password.'], 401);
            return;
        }
        if ((int) ($user['is_active'] ?? 1) === 0) {
            $this->json(['error' => 'This account has been disabled.'], 403);
            return;
        }

        $token = ApiAuth::issue((int) $user['id']);
        $this->json(['token' => $token, 'user' => User::payload($user)]);
    }

    public function me(): void
    {
        $user = ApiAuth::user();
        if ($user === null) {
            $this->json(['error' => 'Unauthorized.'], 401);
            return;
        }
        $this->json(['user' => User::payload($user)]);
    }

    public function logout(): void
    {
        ApiAuth::revoke();
        $this->json(['success' => true]);
    }

    public function updateProfile(): void
    {
        $userId = ApiAuth::requireId();
        $body = $this->body();
        User::updateProfile($userId, [
            'name' => trim((string) ($body['name'] ?? '')) ?: null,
            'bio' => isset($body['bio']) ? trim((string) $body['bio']) : null,
            'location' => isset($body['location']) ? trim((string) $body['location']) : null,
        ]);
        $user = User::find($userId);
        $this->json(['user' => $user !== null ? User::payload($user) : null]);
    }

    public function uploadAvatar(): void
    {
        $userId = ApiAuth::requireId();

        if (!isset($_FILES['avatar']) || !is_array($_FILES['avatar'])) {
            $this->json(['error' => 'No image uploaded.'], 422);
            return;
        }

        $file = $_FILES['avatar'];
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $this->json(['error' => 'Could not read the uploaded image.'], 422);
            return;
        }

        $maxBytes = 5 * 1024 * 1024;
        if (($file['size'] ?? 0) > $maxBytes) {
            $this->json(['error' => 'Image must be 5 MB or smaller.'], 422);
            return;
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file((string) $file['tmp_name']) ?: '';
        $extMap = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];
        if (!isset($extMap[$mime])) {
            $this->json(['error' => 'Use a JPG, PNG, or WebP image.'], 422);
            return;
        }

        $dir = dirname(__DIR__, 2) . '/public/uploads/avatars';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            $this->json(['error' => 'Upload folder is not writable.'], 500);
            return;
        }

        $filename = sprintf('user_%d_%s.%s', $userId, bin2hex(random_bytes(6)), $extMap[$mime]);
        $absolute = $dir . '/' . $filename;
        if (!move_uploaded_file((string) $file['tmp_name'], $absolute)) {
            $this->json(['error' => 'Could not save the image.'], 500);
            return;
        }

        $user = User::find($userId);
        if ($user !== null && !empty($user['avatar'])) {
            $old = dirname(__DIR__, 2) . '/public/' . ltrim((string) $user['avatar'], '/');
            if (is_file($old)) {
                @unlink($old);
            }
        }

        $relative = 'uploads/avatars/' . $filename;
        User::updateProfile($userId, ['avatar' => $relative]);
        $user = User::find($userId);
        $this->json(['user' => $user !== null ? User::payload($user) : null]);
    }

    // ---- Skills -----------------------------------------------------------

    public function skills(): void
    {
        $this->json([
            'skills' => array_map([Skill::class, 'payload'], Skill::all()),
        ]);
    }

    public function mySkills(): void
    {
        $userId = ApiAuth::requireId();
        $rows = UserSkill::forUser($userId);
        $offers = [];
        $wants = [];
        foreach ($rows as $row) {
            $payload = UserSkill::payload($row);
            if ($payload['type'] === 'offer') {
                $offers[] = $payload;
            } else {
                $wants[] = $payload;
            }
        }
        $this->json(['offers' => $offers, 'wants' => $wants]);
    }

    public function addSkill(): void
    {
        $userId = ApiAuth::requireId();
        $body = $this->body();

        $name = trim((string) ($body['name'] ?? ''));
        $type = strtolower(trim((string) ($body['type'] ?? '')));
        $level = strtolower(trim((string) ($body['level'] ?? 'intermediate')));
        $description = trim((string) ($body['description'] ?? ''));
        $category = trim((string) ($body['category'] ?? 'General')) ?: 'General';

        if ($name === '') {
            $this->json(['error' => 'Skill name is required.'], 422);
            return;
        }
        if (!in_array($type, ['offer', 'want'], true)) {
            $this->json(['error' => 'Type must be "offer" or "want".'], 422);
            return;
        }
        if (!in_array($level, ['beginner', 'intermediate', 'advanced', 'expert'], true)) {
            $level = 'intermediate';
        }

        $skillId = Skill::findOrCreate($name, $category);
        UserSkill::add($userId, $skillId, $type, $level, $description !== '' ? $description : null);

        $this->json(['success' => true], 201);
    }

    public function deleteSkill(string $id): void
    {
        $this->disableSkill($id);
    }

    public function updateSkill(string $id): void
    {
        $userId = ApiAuth::requireId();
        $skillId = (int) $id;
        $body = $this->body();
        $level = strtolower(trim((string) ($body['level'] ?? 'intermediate')));
        $description = trim((string) ($body['description'] ?? ''));

        if (!in_array($level, ['beginner', 'intermediate', 'advanced', 'expert'], true)) {
            $this->json(['error' => 'Invalid skill level.'], 422);
            return;
        }
        if (UserSkill::findOwned($skillId, $userId) === null) {
            $this->json(['error' => 'Skill not found.'], 404);
            return;
        }

        UserSkill::updateOwned($skillId, $userId, $level, $description !== '' ? $description : null);
        $this->json(['success' => true]);
    }

    public function disableSkill(string $id): void
    {
        $userId = ApiAuth::requireId();
        $ok = UserSkill::setActive((int) $id, $userId, false);
        if (!$ok) {
            $this->json(['error' => 'Skill not found.'], 404);
            return;
        }
        $this->json(['success' => true, 'is_active' => false]);
    }

    public function enableSkill(string $id): void
    {
        $userId = ApiAuth::requireId();
        $ok = UserSkill::setActive((int) $id, $userId, true);
        if (!$ok) {
            $this->json(['error' => 'Skill not found.'], 404);
            return;
        }
        $this->json(['success' => true, 'is_active' => true]);
    }

    // ---- Dashboard --------------------------------------------------------

    public function dashboard(): void
    {
        $userId = ApiAuth::requireId();
        $user = User::find($userId);

        $skillRows = UserSkill::forUser($userId, null, true);
        $offerCount = 0;
        $wantCount = 0;
        foreach ($skillRows as $row) {
            if ((string) $row['type'] === 'offer') {
                $offerCount++;
            } else {
                $wantCount++;
            }
        }

        $matches = SwapMatch::forUser($userId);
        $pending = 0;
        $accepted = 0;
        foreach ($matches as $m) {
            if ((string) $m['status'] === 'pending') {
                $pending++;
            } elseif ((string) $m['status'] === 'accepted') {
                $accepted++;
            }
        }

        // Top AI/score suggestions for the dashboard preview.
        $candidates = MatchingService::candidates($userId, 3);
        $suggestions = GeminiService::rankMatches($candidates, $this->viewerSkillNames($userId), $userId);

        $this->json([
            'user' => $user !== null ? User::payload($user) : null,
            'stats' => [
                'skills_offered' => $offerCount,
                'skills_wanted' => $wantCount,
                'pending_matches' => $pending,
                'active_swaps' => $accepted,
                'upcoming_sessions' => SwapSession::countUpcoming($userId),
            ],
            'suggestions' => $this->enrichCandidates($suggestions),
            'recent_matches' => array_map(
                static fn (array $m): array => SwapMatch::payload($m, $userId),
                array_slice($matches, 0, 5)
            ),
        ]);
    }

    // ---- Discover & Matches ----------------------------------------------

    public function discover(): void
    {
        $userId = ApiAuth::requireId();
        $offerCount = UserSkill::countForUser($userId, 'offer');
        $wantCount = UserSkill::countForUser($userId, 'want');
        $canSwap = $offerCount > 0 || $wantCount > 0;

        $candidates = MatchingService::candidates($userId, 20);
        $ranked = GeminiService::rankMatches($candidates, $this->viewerSkillNames($userId), $userId);
        $this->json([
            'ai' => GeminiService::isConfigured() ? 'gemini' : 'fallback',
            'can_swap' => $canSwap,
            'skills_offered' => $offerCount,
            'skills_wanted' => $wantCount,
            'matches' => $this->enrichCandidates($ranked),
        ]);
    }

    public function matches(): void
    {
        $userId = ApiAuth::requireId();
        $archived = isset($_GET['archived']) && (string) $_GET['archived'] === '1';
        $rows = SwapMatch::forUser($userId, $archived);
        $this->json([
            'matches' => array_map(
                fn (array $m): array => $this->matchPayload($m, $userId),
                $rows
            ),
        ]);
    }

    public function createMatch(): void
    {
        $userId = ApiAuth::requireId();
        $body = $this->body();
        $partnerId = (int) ($body['partner_id'] ?? 0);
        $message = trim((string) ($body['message'] ?? ''));
        $score = (float) ($body['score'] ?? 0);

        if ($partnerId <= 0 || $partnerId === $userId) {
            $this->json(['error' => 'A valid partner is required.'], 422);
            return;
        }
        if (User::find($partnerId) === null) {
            $this->json(['error' => 'That user no longer exists.'], 404);
            return;
        }
        if (SwapMatch::between($userId, $partnerId) !== null) {
            $this->json(['error' => 'You already have a swap request with this person.'], 422);
            return;
        }
        if (!UserSkill::hasAny($userId)) {
            $this->json(['error' => 'Add at least one skill before requesting a swap. Open My Skills to add what you can teach or want to learn.'], 422);
            return;
        }
        if (!UserSkill::hasAny($partnerId)) {
            $this->json(['error' => 'This person has not added any skills yet, so a swap is not available.'], 422);
            return;
        }

        $matchId = SwapMatch::create($userId, $partnerId, $score, $message !== '' ? $message : null);
        $match = SwapMatch::find($matchId);
        $this->json([
            'match' => $match !== null ? SwapMatch::payload(
                $this->matchWithNames($matchId),
                $userId
            ) : null,
        ], 201);
    }

    public function respondMatch(string $id): void
    {
        $userId = ApiAuth::requireId();
        $matchId = (int) $id;
        $body = $this->body();
        $action = strtolower(trim((string) ($body['action'] ?? '')));

        $match = SwapMatch::find($matchId);
        if ($match === null) {
            $this->json(['error' => 'Match not found.'], 404);
            return;
        }
        // Only the partner (the one who received the request) may respond.
        if ((int) $match['partner_id'] !== $userId) {
            $this->json(['error' => 'You can only respond to requests sent to you.'], 403);
            return;
        }
        if (!in_array($action, ['accept', 'decline'], true)) {
            $this->json(['error' => 'Action must be "accept" or "decline".'], 422);
            return;
        }

        SwapMatch::updateStatus($matchId, $action === 'accept' ? 'accepted' : 'declined');
        $this->json(['success' => true, 'status' => $action === 'accept' ? 'accepted' : 'declined']);
    }

    public function archiveMatch(string $id): void
    {
        $userId = ApiAuth::requireId();
        $matchId = (int) $id;
        if (!SwapMatch::involves($matchId, $userId)) {
            $this->json(['error' => 'Conversation not found.'], 404);
            return;
        }
        UserMatchPrefs::archive($userId, $matchId);
        $this->json(['success' => true]);
    }

    public function unarchiveMatch(string $id): void
    {
        $userId = ApiAuth::requireId();
        $matchId = (int) $id;
        if (!SwapMatch::involves($matchId, $userId)) {
            $this->json(['error' => 'Conversation not found.'], 404);
            return;
        }
        UserMatchPrefs::unarchive($userId, $matchId);
        $this->json(['success' => true]);
    }

    public function deleteMatch(string $id): void
    {
        $userId = ApiAuth::requireId();
        $matchId = (int) $id;
        if (!SwapMatch::involves($matchId, $userId)) {
            $this->json(['error' => 'Conversation not found.'], 404);
            return;
        }
        UserMatchPrefs::delete($userId, $matchId);
        $this->json(['success' => true]);
    }

    // ---- Messages ---------------------------------------------------------

    public function messages(string $id): void
    {
        $userId = ApiAuth::requireId();
        $matchId = (int) $id;
        if (!SwapMatch::involves($matchId, $userId)) {
            $this->json(['error' => 'Conversation not found.'], 404);
            return;
        }
        $match = SwapMatch::find($matchId);
        $partnerId = $match !== null ? SwapMatch::partnerId($match, $userId) : 0;
        $partnerOnline = UserPresence::isOnline($partnerId);

        Message::markRead($matchId, $userId);
        $rows = Message::forMatch($matchId);
        $this->json([
            'partner_online' => $partnerOnline,
            'messages' => array_map(
                static fn (array $m): array => Message::payload($m, $userId, $partnerOnline),
                $rows
            ),
        ]);
    }

    public function sendMessage(string $id): void
    {
        $userId = ApiAuth::requireId();
        $matchId = (int) $id;
        if (!SwapMatch::involves($matchId, $userId)) {
            $this->json(['error' => 'Conversation not found.'], 404);
            return;
        }
        $body = $this->body();
        $text = trim((string) ($body['body'] ?? ''));
        if ($text === '') {
            $this->json(['error' => 'Message cannot be empty.'], 422);
            return;
        }
        $match = SwapMatch::find($matchId);
        $partnerId = $match !== null ? SwapMatch::partnerId($match, $userId) : 0;
        $partnerOnline = UserPresence::isOnline($partnerId);

        $msgId = Message::create($matchId, $userId, $text);
        $row = Message::find($msgId);
        $this->json([
            'id' => $msgId,
            'success' => true,
            'message' => $row !== null ? Message::payload($row, $userId, $partnerOnline) : null,
        ], 201);
    }

    // ---- Sessions ---------------------------------------------------------

    public function sessions(): void
    {
        $userId = ApiAuth::requireId();
        $rows = SwapSession::forUser($userId);
        $this->json([
            'sessions' => array_map(
                static fn (array $s): array => SwapSession::payload($s, $userId),
                $rows
            ),
        ]);
    }

    public function createSession(): void
    {
        $userId = ApiAuth::requireId();
        $body = $this->body();
        $matchId = (int) ($body['match_id'] ?? 0);
        $scheduledAt = trim((string) ($body['scheduled_at'] ?? ''));
        $skillId = (int) ($body['skill_id'] ?? 0);
        $notes = trim((string) ($body['notes'] ?? ''));

        if (!SwapMatch::involves($matchId, $userId)) {
            $this->json(['error' => 'You can only schedule sessions for your own swaps.'], 403);
            return;
        }
        $match = SwapMatch::find($matchId);
        if ($match === null || (string) $match['status'] !== 'accepted') {
            $this->json(['error' => 'The swap must be accepted before scheduling a session.'], 422);
            return;
        }
        if ($scheduledAt === '') {
            $this->json(['error' => 'A date and time is required.'], 422);
            return;
        }
        $normalized = SwapSession::normalizeScheduledAt($scheduledAt);
        if ($normalized === null) {
            $this->json(['error' => 'Enter a valid date and time.'], 422);
            return;
        }

        $sessionId = SwapSession::upsertForMatch(
            $matchId,
            $skillId > 0 ? $skillId : null,
            $normalized,
            $notes !== '' ? $notes : null
        );
        $this->json(['id' => $sessionId, 'success' => true], 201);
    }

    public function sessionReminders(): void
    {
        $userId = ApiAuth::requireId();
        $rows = SwapSession::upcomingReminders($userId);
        $this->json([
            'reminders' => array_map(
                static fn (array $s): array => SwapSession::payload($s, $userId),
                $rows
            ),
        ]);
    }

    public function matchRating(string $id): void
    {
        $userId = ApiAuth::requireId();
        $matchId = (int) $id;
        if (!SwapMatch::involves($matchId, $userId)) {
            $this->json(['error' => 'Swap not found.'], 404);
            return;
        }
        $mine = SwapRating::forMatchByRater($matchId, $userId);
        $match = SwapMatch::find($matchId);
        $partnerId = $match !== null && (int) $match['requester_id'] === $userId
            ? (int) $match['partner_id']
            : (int) ($match['requester_id'] ?? 0);
        $partnerStats = $partnerId > 0 ? SwapRating::averageForUser($partnerId) : ['avg' => 0.0, 'count' => 0];

        $this->json([
            'my_rating' => $mine !== null ? SwapRating::payload($mine) : null,
            'partner_rating_avg' => $partnerStats['avg'],
            'partner_rating_count' => $partnerStats['count'],
        ]);
    }

    public function submitRating(string $id): void
    {
        $userId = ApiAuth::requireId();
        $matchId = (int) $id;
        if (!SwapMatch::involves($matchId, $userId)) {
            $this->json(['error' => 'Swap not found.'], 404);
            return;
        }
        $match = SwapMatch::find($matchId);
        if ($match === null || (string) $match['status'] !== 'accepted') {
            $this->json(['error' => 'You can only rate an accepted swap.'], 422);
            return;
        }

        $body = $this->body();
        $rating = (int) ($body['rating'] ?? 0);
        $comment = trim((string) ($body['comment'] ?? ''));
        if ($rating < 1 || $rating > 5) {
            $this->json(['error' => 'Rating must be between 1 and 5 stars.'], 422);
            return;
        }

        $ratedUserId = (int) $match['requester_id'] === $userId
            ? (int) $match['partner_id']
            : (int) $match['requester_id'];

        $ratingId = SwapRating::upsert(
            $matchId,
            $userId,
            $ratedUserId,
            $rating,
            $comment !== '' ? $comment : null
        );
        $row = SwapRating::forMatchByRater($matchId, $userId);
        $this->json([
            'success' => true,
            'id' => $ratingId,
            'rating' => $row !== null ? SwapRating::payload($row) : null,
        ], 201);
    }

    // ---- AI ---------------------------------------------------------------

    public function aiMatchSuggestions(): void
    {
        $userId = ApiAuth::requireId();
        $candidates = MatchingService::candidates($userId, 10);
        $ranked = GeminiService::rankMatches($candidates, $this->viewerSkillNames($userId), $userId);
        $this->json([
            'ai' => GeminiService::isConfigured() ? 'gemini' : 'fallback',
            'suggestions' => $this->enrichCandidates($ranked),
        ]);
    }

    public function aiAssistant(): void
    {
        $userId = ApiAuth::requireId();
        $body = $this->body();
        $message = trim((string) ($body['message'] ?? ''));
        if ($message === '') {
            $this->json(['error' => 'Please type a message.'], 422);
            return;
        }
        $reply = GeminiService::assistant($message, $userId);
        $this->json([
            'reply' => $reply,
            'ai' => GeminiService::assistantUsedFallback() ? 'fallback' : 'gemini',
        ]);
    }

    // ---- Helpers ----------------------------------------------------------

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function matchPayload(array $row, int $userId): array
    {
        $payload = SwapMatch::payload($row, $userId);
        $matchId = (int) $row['id'];
        $partnerId = SwapMatch::partnerId($row, $userId);
        $partnerOnline = UserPresence::isOnline($partnerId);

        $payload['partner_online'] = $partnerOnline;
        $payload['archived'] = !empty($row['user_archived_at']);
        $payload['unread_count'] = Message::unreadCount($matchId, $userId);

        $last = Message::lastForMatch($matchId);
        if ($last !== null) {
            $lastPayload = Message::payload($last, $userId, $partnerOnline);
            $payload['last_message'] = $lastPayload['body'];
            $payload['last_message_mine'] = $lastPayload['mine'];
            $payload['last_message_status'] = $lastPayload['status'];
        } else {
            $payload['last_message'] = (string) ($row['message'] ?? '');
            $payload['last_message_mine'] = (int) $row['requester_id'] === $userId;
            $payload['last_message_status'] = null;
        }

        return $payload;
    }

    /**
     * Viewer's offered/wanted skill NAMES (for AI prompts).
     *
     * @return array{offer: array<int,string>, want: array<int,string>}
     */
    private function viewerSkillNames(int $userId): array
    {
        $rows = UserSkill::forUser($userId, null, true);
        $out = ['offer' => [], 'want' => []];
        foreach ($rows as $row) {
            $out[(string) $row['type']][] = (string) $row['name'];
        }
        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function matchWithNames(int $matchId): array
    {
        $row = SwapMatch::find($matchId) ?? [];
        $requester = User::find((int) ($row['requester_id'] ?? 0));
        $partner = User::find((int) ($row['partner_id'] ?? 0));
        $row['requester_name'] = $requester['name'] ?? '';
        $row['partner_name'] = $partner['name'] ?? '';
        return $row;
    }

    /**
     * @param array<int, array<string, mixed>> $candidates
     * @return array<int, array<string, mixed>>
     */
    private function enrichCandidates(array $candidates): array
    {
        $ids = array_map(static fn (array $c): int => (int) $c['user_id'], $candidates);
        $ratings = SwapRating::averagesForUsers($ids);

        return array_map(function (array $c) use ($ratings): array {
            $payload = $this->candidatePayload($c);
            $uid = (int) $c['user_id'];
            $payload['rating_avg'] = $ratings[$uid]['avg'] ?? 0.0;
            $payload['rating_count'] = $ratings[$uid]['count'] ?? 0;
            return $payload;
        }, $candidates);
    }

    /**
     * @param array<string, mixed> $c
     * @return array<string, mixed>
     */
    private function candidatePayload(array $c): array
    {
        return [
            'user_id' => (int) $c['user_id'],
            'name' => (string) $c['user_name'],
            'location' => (string) ($c['location'] ?? ''),
            'bio' => (string) ($c['bio'] ?? ''),
            'score' => (float) $c['score'],
            'mutual' => (bool) ($c['mutual'] ?? false),
            'they_offer' => array_values($c['they_offer'] ?? []),
            'they_want' => array_values($c['they_want'] ?? []),
            'reason' => (string) ($c['reason'] ?? ''),
        ];
    }
}
