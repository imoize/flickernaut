import type { ValidationResult } from '../../../@types/types.js';
import { getSettings } from './settings.js';

type ValidateField = 'name' | 'native' | 'flatpak';

/**
 * Validates a given value against a specific field and checks for duplicates.
 *
 * @param val - The value to validate.
 * @param id - The ID of the current editor to exclude from duplicate checks.
 * @param field - The field to validate against. Can be 'name', 'native', or 'flatpak'.
 * @returns An object containing validation results:
 * - `isValid`: Whether the value is valid (not a duplicate).
 * - `isDuplicate`: Whether the value is a duplicate.
 * - `isEmpty`: Whether the value is empty.
 */
export function validate(
    val: string,
    id: number,
    field: ValidateField,
): ValidationResult {
    const values = val.trim();
    if (!values) {
        return { isValid: false, isDuplicate: false, isEmpty: true };
    }

    const editors = getSettings().filter(editor => editor.id !== id);

    let isDuplicate = false;
    if (field === 'name') {
        isDuplicate = editors.some(editor => editor.name === values);
    }
    else if (field === 'native') {
        isDuplicate = editors.some(editor => Array.isArray(editor.native) && editor.native.join(' ') === values);
    }
    else if (field === 'flatpak') {
        isDuplicate = editors.some(editor => Array.isArray(editor.flatpak) && editor.flatpak.join(' ') === values);
    }

    return {
        isValid: !isDuplicate,
        isDuplicate,
        isEmpty: false,
    };
}
