import type Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import { validate } from '../lib/prefs/validation.js';

export function createEntryRow(
    title: string,
    value: string,
    onChange: (val: string) => void,
    settings?: Gio.Settings,
    field?: 'name' | 'native' | 'flatpak',
    editorId?: number,
): Adw.EntryRow {
    const entryRow = new Adw.EntryRow({
        title,
        text: value,
    });

    entryRow.connect('changed', () => {
        const val = entryRow.text;

        if (settings && field && typeof editorId === 'number') {
            const result = validate(settings, val, editorId, field);

            if (field === 'name') {
                if (!result.isValid) {
                    entryRow.add_css_class('error');
                    entryRow.set_tooltip_text(
                        result.isEmpty
                            ? 'Name cannot be empty'
                            : result.isDuplicate
                                ? 'Name already exists'
                                : '',
                    );
                    return;
                }
            }

            if ((field === 'native' || field === 'flatpak') && result.isDuplicate) {
                entryRow.add_css_class('error');
                entryRow.set_tooltip_text(
                    field === 'native'
                        ? 'Native command already exists'
                        : 'Flatpak ID already exists',
                );
                return;
            }

            entryRow.remove_css_class('error');
            entryRow.set_tooltip_text(null);
        }

        onChange(val);
    });

    return entryRow;
}
