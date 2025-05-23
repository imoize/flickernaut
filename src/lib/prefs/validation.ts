import type { ValidationResult } from '../../../@types/types.js';
import { getAppSettings } from './settings.js';

type ValidateField = 'name';

/**
 * Validates a given value against a specific field and checks for duplicates.
 *
 * @param val - The value to validate.
 * @param id - The ID of the current application to exclude from duplicate checks.
 * @param field - The field to validate against. Currently supports 'name'.
 * @returns An object containing validation results:
 * - `isValid`: Whether the value is valid (not a duplicate and not empty).
 * - `isDuplicate`: Whether the value is a duplicate.
 * - `isEmpty`: Whether the value is empty.
 */
export function validate(
    val: string,
    id: string,
    field: ValidateField,
): ValidationResult {
    const value = val.trim();
    if (!value) {
        return { isValid: false, isDuplicate: false, isEmpty: true };
    }

    const applications = getAppSettings().filter(app => app.id !== id);

    let isDuplicate = false;
    if (field === 'name') {
        isDuplicate = applications.some(app => app.name === value);
    }

    return {
        isValid: !isDuplicate,
        isDuplicate,
        isEmpty: false,
    };
}
