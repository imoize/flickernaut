import type { Editor } from '../../@types/types.js';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { normalizeArray, normalizeArrayOutput, normalizeText } from '../lib/prefs/normalize.js';
import { setSettings, settings } from '../lib/prefs/settings.js';
import { validate } from '../lib/prefs/validation.js';
import { ToggleSwitchClass } from '../ui/widgets/switch.js';

export class EditorListClass extends Adw.ExpanderRow {
    private declare _id: number;
    private declare _entryName: Adw.EntryRow;
    private declare _entryNative: Adw.EntryRow;
    private declare _entryFlatpak: Adw.EntryRow;
    private declare _entryArgument: Adw.EntryRow;
    private declare _supportFile: Adw.SwitchRow;
    private declare _toggleSwitch: ToggleSwitchClass;
    private declare _banner: Adw.Banner;

    constructor(editor: Editor, banner: Adw.Banner) {
        super();

        this._id = editor.id;

        this._entryName = new Adw.EntryRow({
            title: _('Name'),
            text: normalizeText(editor.name),
        });

        this._entryName.connect('changed', () => {
            const input = this._entryName;

            if (settings && 'name' && typeof editor.id === 'number') {
                const val = input.text;
                const result = validate(val, editor.id, 'name');

                if (!result.isValid) {
                    input.add_css_class('error');
                    input.set_tooltip_text(
                        result.isEmpty
                            ? _('Name cannot be empty')
                            : result.isDuplicate
                                ? _('Name already exists')
                                : '',
                    );
                    return;
                }
                input.remove_css_class('error');
                input.set_tooltip_text(null);
                this._updateConfig();
            }
        });

        this._entryNative = new Adw.EntryRow({
            title: _('Native Cmd'),
            text: normalizeArrayOutput(editor.native),
        });

        this._entryNative.connect('changed', () => {
            const input = this._entryNative;

            if (settings && 'native' && typeof editor.id === 'number') {
                const val = input.text;
                const result = validate(val, editor.id, 'native');

                if (result.isDuplicate) {
                    input.add_css_class('error');
                    input.set_tooltip_text(
                        _('Native command already exists'),
                    );
                    return;
                }

                input.remove_css_class('error');
                input.set_tooltip_text(null);
            }
            this._updateConfig();
        });

        this._entryFlatpak = new Adw.EntryRow({
            title: _('Flatpak ID'),
            text: normalizeArrayOutput(editor.flatpak),
        });

        this._entryFlatpak.connect('changed', () => {
            const input = this._entryFlatpak;

            if (settings && 'flatpak' && typeof editor.id === 'number') {
                const val = input.text;
                const result = validate(val, editor.id, 'flatpak');

                if (result.isDuplicate) {
                    input.add_css_class('error');
                    input.set_tooltip_text(
                        _('Flatpak ID already exists'),
                    );
                    return;
                }

                input.remove_css_class('error');
                input.set_tooltip_text(null);
            }
            this._updateConfig();
        });

        this._entryArgument = new Adw.EntryRow({
            title: _('Arguments'),
            text: normalizeArrayOutput(editor.arguments),
        });

        this._entryArgument.connect('changed', () => {
            this._updateConfig();
        });

        this._supportFile = new Adw.SwitchRow({
            title: _('Support File'),
            active: editor.supports_files,
        });

        this._supportFile.connect('notify::active', () => {
            this._updateConfig();
        });

        this._toggleSwitch = new ToggleSwitchClass({
            active: editor.enable,
            valign: Gtk.Align.CENTER,
        });

        this._toggleSwitch.connect('notify::active', () => {
            this._updateConfig();
        });

        this._banner = banner;

        this.set_title(editor.name);

        this.add_suffix(this._toggleSwitch);

        this.add_row(this._entryName);
        this.add_row(this._entryNative);
        this.add_row(this._entryFlatpak);
        this.add_row(this._entryArgument);
        this.add_row(this._supportFile);
    }

    private _updateConfig() {
        const newSettings: Editor = {
            id: this._id,
            name: normalizeText(this._entryName.text),
            native: normalizeArray(this._entryNative.text),
            flatpak: normalizeArray(this._entryFlatpak.text),
            arguments: normalizeArray(this._entryArgument.text),
            supports_files: this._supportFile.active,
            enable: this._toggleSwitch.active,
        };

        this.set_title(newSettings.name);

        try {
            setSettings(newSettings);
            this._banner.set_revealed(true);
        }
        catch (error) {
            console.error('Failed to update editor configuration:', error);
        }
    }
}

export const EditorList = GObject.registerClass(
    {
        GTypeName: 'EditorList',
    },
    EditorListClass,
);
