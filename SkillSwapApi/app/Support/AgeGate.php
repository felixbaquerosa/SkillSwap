<?php

declare(strict_types=1);

namespace App\Support;

use DateTimeImmutable;

/** Age gate for registration — SkillSwap is 18+ only. */
final class AgeGate
{
    public const MIN_AGE = 18;

    /**
     * Validate YYYY-MM-DD birthdate. Returns an error message or null if OK.
     */
    public static function validateBirthdate(string $raw): ?string
    {
        $birthdate = trim($raw);
        if ($birthdate === '') {
            return 'Date of birth is required.';
        }

        $dt = DateTimeImmutable::createFromFormat('Y-m-d', $birthdate);
        $errors = DateTimeImmutable::getLastErrors();
        if ($dt === false || ($errors['warning_count'] ?? 0) > 0 || ($errors['error_count'] ?? 0) > 0) {
            return 'Enter a valid date of birth.';
        }

        $today = new DateTimeImmutable('today');
        if ($dt > $today) {
            return 'Date of birth cannot be in the future.';
        }

        $cutoff = $today->modify('-' . self::MIN_AGE . ' years');
        if ($dt > $cutoff) {
            return 'You must be at least ' . self::MIN_AGE . ' years old to join SkillSwap.';
        }

        $oldest = $today->modify('-120 years');
        if ($dt < $oldest) {
            return 'Enter a valid date of birth.';
        }

        return null;
    }
}
