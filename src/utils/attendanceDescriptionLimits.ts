/**
 * Keep in sync with `ciel_backend/src/engagement/attendance-description.constants.ts`
 * and run `scripts/sql/attendance-description-varchar-2000.sql` on the DB when changing MAX_CHARS.
 */
export const ATTENDANCE_DESCRIPTION_MAX_CHARS = 2000;

export const ATTENDANCE_DESCRIPTION_MAX_WORDS = 40;

export function attendanceDescriptionWordCount(text: string): number {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
}

export function attendanceDescriptionOverLimit(text: string): {
    overWords: boolean;
    overChars: boolean;
    wordCount: number;
    charCount: number;
} {
    const trimmed = text.trim();
    const wordCount = attendanceDescriptionWordCount(trimmed);
    const charCount = trimmed.length;
    return {
        overWords: wordCount > ATTENDANCE_DESCRIPTION_MAX_WORDS,
        overChars: charCount > ATTENDANCE_DESCRIPTION_MAX_CHARS,
        wordCount,
        charCount,
    };
}

export function attendanceDescriptionLimitMessage(
    wordCount: number,
    charCount: number,
): string | null {
    if (charCount > ATTENDANCE_DESCRIPTION_MAX_CHARS && wordCount > ATTENDANCE_DESCRIPTION_MAX_WORDS) {
        return `Brief description is too long (${wordCount}/${ATTENDANCE_DESCRIPTION_MAX_WORDS} words and ${charCount}/${ATTENDANCE_DESCRIPTION_MAX_CHARS} characters). Shorten it and try again.`;
    }
    if (charCount > ATTENDANCE_DESCRIPTION_MAX_CHARS) {
        return `Brief description is too long (${charCount}/${ATTENDANCE_DESCRIPTION_MAX_CHARS} characters). Use shorter sentences and try again.`;
    }
    if (wordCount > ATTENDANCE_DESCRIPTION_MAX_WORDS) {
        return `Brief description is too long (${wordCount}/${ATTENDANCE_DESCRIPTION_MAX_WORDS} words). Shorten it and try again.`;
    }
    return null;
}
