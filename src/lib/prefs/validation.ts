import type Gio from 'gi://Gio';
import type { ValidationResult } from '../../../@types/types.js';

type ValidateField = 'name' | 'native' | 'flatpak';

function validate(
    settings: Gio.Settings,
    val: string,
    id: number,
    field: ValidateField,
): ValidationResult {
    const values = val.trim();
    if (!values) {
        return { isValid: false, isDuplicate: false, isEmpty: true };
    }

    const editors = settings.get_strv('editors');
    let isDuplicate = false;

    for (const data of editors) {
        try {
            const editor = JSON.parse(data);
            if (editor.id !== id) {
                if (field === 'name' && editor.name === values) {
                    isDuplicate = true;
                    break;
                }
                if (field === 'native' && Array.isArray(editor.native) && editor.native.join(' ') === values) {
                    isDuplicate = true;
                    break;
                }
                if (field === 'flatpak' && Array.isArray(editor.flatpak) && editor.flatpak.join(' ') === values) {
                    isDuplicate = true;
                    break;
                }
            }
        }
        catch {
            continue;
        }
    }

    return {
        isValid: !isDuplicate,
        isDuplicate,
        isEmpty: false,
    };
}

export { validate };
