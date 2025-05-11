/**
 * Trims leading and trailing whitespace from the input string.
 *
 * @param input - The string to normalize.
 * @returns The trimmed string.
 */
export function normalizeText(input: string): string {
    return input.trim();
}

/**
 * Trims leading and trailing whitespace from the input string,
 * replaces multiple spaces with a single space, and splits the string into an array of words.
 *
 * @param input - The string to normalize and split.
 * @returns An array of words from the normalized string.
 */
export function normalizeArray(input: string): string[] {
    return input.trim().replace(/\s+/g, ' ').split(' ');
}

/**
 * Joins an array of strings into a single string, trims leading and trailing whitespace,
 * and replaces multiple spaces with a single space.
 *
 * @param input - The array of strings to normalize and join. Defaults to an empty array.
 * @returns A normalized string created by joining the array elements.
 */
export function normalizeArrayOutput(input: string[] = []): string {
    return input.join(' ').trim().replace(/\s+/g, ' ');
}
