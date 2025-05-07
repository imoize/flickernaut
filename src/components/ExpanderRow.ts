import type Gio from 'gi://Gio';
import type { Editor } from '../../@types/types.js';
import Adw from 'gi://Adw';
import { createEntryRow } from './EntryRow.js';
import { createSwitchRow } from './SwitchRow.js';
import { createEnableSwitch } from './widgets/Switch.js';

export function createExpanderRow(
    editor: Editor,
    onUpdate: (config: Editor) => void,
    settings?: Gio.Settings,
): Adw.ExpanderRow {
    const row = new Adw.ExpanderRow({ title: editor.name });

    const enableSwitch = createEnableSwitch(editor.enable || false, (state) => {
        editor.enable = state;
        onUpdate(editor);
    });
    row.add_suffix(enableSwitch);

    row.add_row(createEntryRow('Name', editor.name || '', (val) => {
        editor.name = val;
        row.title = val || 'Unnamed';
        onUpdate(editor);
    }, settings, 'name', editor.id));

    row.add_row(createEntryRow('Native Command', (editor.native || []).join(' '), (val) => {
        editor.native = val.split(/\s+/);
        onUpdate(editor);
    }, settings, 'native', editor.id));

    row.add_row(createEntryRow('Flatpak ID', (editor.flatpak || []).join(' '), (val) => {
        editor.flatpak = val.split(/\s+/);
        onUpdate(editor);
    }, settings, 'flatpak', editor.id));

    row.add_row(createEntryRow('Arguments', (editor.arguments || []).join(' '), (val) => {
        editor.arguments = val.split(/\s+/);
        onUpdate(editor);
    }));

    row.add_row(createSwitchRow('Support Files', editor.supports_files || false, (val) => {
        editor.supports_files = val;
        onUpdate(editor);
    }));

    return row;
}
