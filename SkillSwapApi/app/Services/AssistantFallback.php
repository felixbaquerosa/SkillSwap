<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SwapMatch;
use App\Models\User;
use App\Models\UserSkill;

/**
 * Rule-based SkillSwap assistant used when Gemini is unavailable or unconfigured.
 */
final class AssistantFallback
{
    public static function reply(string $userMessage, ?int $userId): string
    {
        $msg = strtolower(trim($userMessage));
        $ctx = $userId !== null ? self::userContext($userId) : null;

        if (self::matches($msg, ['hi', 'hello', 'hey', 'good morning', 'good afternoon'])) {
            return self::greeting($ctx);
        }
        if (self::matches($msg, ['how does skillswap work', 'what is skillswap', 'how does this work', 'how it works', 'explain skillswap'])) {
            return self::howItWorks($ctx);
        }
        if (self::matches($msg, ['profile', 'bio', 'write a good', 'about me', 'good skill profile'])) {
            return self::profileTips($ctx);
        }
        if (self::matches($msg, ['first swap', 'first session', 'tips for my first', 'getting started', 'beginner'])) {
            return self::firstSessionTips($ctx);
        }
        if (self::matches($msg, ['discover', 'find match', 'find a match', 'matching', 'top match', 'partner'])) {
            return self::discoverHelp($ctx);
        }
        if (self::matches($msg, ['schedule', 'reminder', 'appointment', 'calendar', 'session time'])) {
            return self::scheduleHelp();
        }
        if (self::matches($msg, ['rating', 'rate', 'star', 'review partner'])) {
            return self::ratingHelp();
        }
        if (self::matches($msg, ['skill', 'edit skill', 'disable', 'my skills', 'add skill'])) {
            return self::skillsHelp($ctx);
        }
        if (self::matches($msg, ['chat', 'message', 'call', 'video', 'voice'])) {
            return self::chatHelp();
        }
        if (self::matches($msg, ['request swap', 'accept', 'decline', 'pending'])) {
            return self::swapStatusHelp($ctx);
        }
        if (self::matches($msg, ['register', 'sign up', 'create account', 'birthday', '18'])) {
            return self::accountHelp();
        }

        return self::defaultReply($ctx);
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function userContext(int $userId): ?array
    {
        $user = User::find($userId);
        if ($user === null) {
            return null;
        }

        $skills = UserSkill::forUser($userId, null, true);
        $offer = [];
        $want = [];
        foreach ($skills as $row) {
            if ((string) $row['type'] === 'offer') {
                $offer[] = (string) $row['name'];
            } else {
                $want[] = (string) $row['name'];
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

        return [
            'name' => (string) $user['name'],
            'offer' => $offer,
            'want' => $want,
            'pending' => $pending,
            'accepted' => $accepted,
        ];
    }

    /**
     * @param array<string, mixed>|null $ctx
     */
    private static function greeting(?array $ctx): string
    {
        $name = is_array($ctx) ? (string) ($ctx['name'] ?? '') : '';
        $hello = $name !== '' ? "Hi {$name}! " : 'Hi! ';

        return $hello . "I'm your SkillSwap guide. I can help with finding matches, setting up skills, "
            . "scheduling sessions, and getting the most from your swaps. What would you like to know?";
    }

    /**
     * @param array<string, mixed>|null $ctx
     */
    private static function howItWorks(?array $ctx): string
    {
        $text = "SkillSwap is peer-to-peer skill bartering — you teach what you know and learn what you need, "
            . "without money.\n\n"
            . "1. Add skills you offer and want to learn (Profile → My skills)\n"
            . "2. Open Discover to find people with complementary skills\n"
            . "3. Request a swap, then chat to plan together\n"
            . "4. Schedule a session from the chat (date & time picker)\n"
            . "5. Join voice or video calls when you're ready\n"
            . "6. Rate your partner after an accepted swap";

        return $text . self::personalizedNextStep($ctx);
    }

    /**
     * @param array<string, mixed>|null $ctx
     */
    private static function profileTips(?array $ctx): string
    {
        $text = "A strong profile helps you get better matches:\n\n"
            . "• List specific skills (e.g. \"Acoustic guitar — beginner friendly\" not just \"Music\")\n"
            . "• Add a short bio about your experience and what you hope to learn\n"
            . "• Set your location so nearby swappers can find you\n"
            . "• Upload a profile photo — people trust real faces\n"
            . "• Keep at least one active skill you offer and one you want to learn";

        return $text . self::personalizedNextStep($ctx);
    }

    /**
     * @param array<string, mixed>|null $ctx
     */
    private static function firstSessionTips(?array $ctx): string
    {
        $text = "Tips for your first swap session:\n\n"
            . "• Agree on a goal before you meet (e.g. \"learn 3 basic chords\")\n"
            . "• Use Schedule in the chat to pick a real date and time\n"
            . "• Start with 30–45 minutes — short and focused works best\n"
            . "• Be on time and come prepared with questions\n"
            . "• After the session, leave an honest star rating for your partner";

        return $text . self::personalizedNextStep($ctx);
    }

    /**
     * @param array<string, mixed>|null $ctx
     */
    private static function discoverHelp(?array $ctx): string
    {
        $text = "To find matches, open the Discover tab. You'll see people whose skills complement yours.\n\n"
            . "• Star ratings show how partners were rated after past swaps\n"
            . "• Tap a profile to view details, then Request swap\n"
            . "• You need at least one active skill listed before you can request\n"
            . "• If you already have a swap with someone, tap Open chat instead";

        return $text . self::personalizedNextStep($ctx);
    }

    private static function scheduleHelp(): string
    {
        return "To schedule a session:\n\n"
            . "1. Open an accepted swap chat (Messages tab)\n"
            . "2. Tap Schedule at the top\n"
            . "3. Pick a date and time with the calendar picker\n"
            . "4. Add optional notes about what you'll cover\n"
            . "5. Tap Confirm session — you can update the time anytime\n\n"
            . "View upcoming sessions on Profile or Home → View schedule reminders.";
    }

    private static function ratingHelp(): string
    {
        return "After a swap is accepted, you'll see a star rating section in the chat.\n\n"
            . "• Tap 1–5 stars to rate your partner's teaching or collaboration\n"
            . "• Ratings appear on Discover and Home as average stars with review count\n"
            . "• New users show as \"New\" until they receive their first rating\n"
            . "• You can update your rating anytime from the same chat screen.";
    }

    /**
     * @param array<string, mixed>|null $ctx
     */
    private static function skillsHelp(?array $ctx): string
    {
        $text = "Manage your skills from Profile → My skills:\n\n"
            . "• Add skills you can teach (Offer) and skills you want to learn (Want)\n"
            . "• Edit level and description anytime\n"
            . "• Disable a skill to hide it without deleting your history\n"
            . "• Re-enable disabled skills when you're ready to swap again\n\n"
            . "You must have at least one active offered skill to request swaps.";

        return $text . self::personalizedNextStep($ctx);
    }

    private static function chatHelp(): string
    {
        return "Messaging and calls live inside each swap chat:\n\n"
            . "• Open Messages to see all your swap conversations\n"
            . "• Use the phone icon for voice calls and the camera icon for video\n"
            . "• Calls open in-app so you can talk while planning your session\n"
            . "• Schedule sessions directly from the same chat screen.";
    }

    /**
     * @param array<string, mixed>|null $ctx
     */
    private static function swapStatusHelp(?array $ctx): string
    {
        $text = "Swap statuses:\n\n"
            . "• Pending — you requested a swap; waiting for the other person to accept\n"
            . "• Accepted — you can chat, schedule sessions, call, and rate each other\n"
            . "• Declined — the request was turned down; try Discover for other matches";

        if (is_array($ctx)) {
            $pending = (int) ($ctx['pending'] ?? 0);
            $accepted = (int) ($ctx['accepted'] ?? 0);
            if ($pending > 0 || $accepted > 0) {
                $text .= "\n\nYour account: {$pending} pending and {$accepted} active swap(s). Check Messages to follow up.";
            }
        }

        return $text;
    }

    private static function accountHelp(): string
    {
        return "Account basics:\n\n"
            . "• You must be 18 or older to register (birthdate is required)\n"
            . "• Use Profile to update your photo, bio, and location\n"
            . "• Enable fingerprint or face sign-in for quick access\n"
            . "• Sign out from Profile when using a shared device";
    }

    /**
     * @param array<string, mixed>|null $ctx
     */
    private static function defaultReply(?array $ctx): string
    {
        $text = "I'm here to help with SkillSwap — matching, skills, sessions, chat, and ratings.\n\n"
            . "Try asking:\n"
            . "• How does SkillSwap work?\n"
            . "• How do I write a good skill profile?\n"
            . "• Tips for my first swap session\n"
            . "• How do I schedule a session?";

        return $text . self::personalizedNextStep($ctx);
    }

    /**
     * @param array<string, mixed>|null $ctx
     */
    private static function personalizedNextStep(?array $ctx): string
    {
        if (!is_array($ctx)) {
            return '';
        }

        $offer = is_array($ctx['offer'] ?? null) ? $ctx['offer'] : [];
        $want = is_array($ctx['want'] ?? null) ? $ctx['want'] : [];
        $pending = (int) ($ctx['pending'] ?? 0);
        $accepted = (int) ($ctx['accepted'] ?? 0);

        if ($offer === [] && $want === []) {
            return "\n\nNext step: go to Profile → My skills and add what you teach and want to learn.";
        }
        if ($accepted > 0) {
            return "\n\nYou have {$accepted} active swap(s) — open Messages to chat or schedule your next session.";
        }
        if ($pending > 0) {
            return "\n\nYou have {$pending} pending request(s). Check Messages for replies.";
        }
        if ($offer !== [] && $want !== []) {
            return "\n\nYou're set up with skills on both sides — open Discover to find your next match.";
        }
        if ($offer === []) {
            return "\n\nAdd at least one skill you can teach so others can swap with you.";
        }

        return "\n\nAdd skills you want to learn so Discover can find better matches for you.";
    }

    private static function matches(string $msg, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($msg, strtolower($needle))) {
                return true;
            }
        }
        return false;
    }
}
