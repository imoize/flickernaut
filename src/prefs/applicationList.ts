import type { Application } from '../../@types/types.js';
import type { BannerHandler } from '../ui/widgets/banner.js';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { normalizeArray, normalizeArrayOutput, normalizeText } from '../lib/prefs/normalize.js';
import { setAppSettings, settings } from '../lib/prefs/settings.js';
import { validate } from '../lib/prefs/validation.js';
import { ToggleSwitchClass } from '../ui/widgets/switch.js';

export class ApplicationListClass extends Adw.ExpanderRow {
    private declare _id: number;
    private declare _name: Adw.EntryRow;
    private declare _native: Adw.EntryRow;
    private declare _flatpak: Adw.EntryRow;
    private declare _arguments: Adw.EntryRow;
    private declare _supports_files: Adw.SwitchRow;
    private declare _toggleSwitch: ToggleSwitchClass;
    private declare _bannerHandler: BannerHandler;

    constructor(application: Application, bannerHandler: BannerHandler) {
        super();

        this._bannerHandler = bannerHandler;

        this.title = application.name;

        this._id = application.id;

        this._name.text = normalizeText(application.name);

        this._native.text = normalizeArrayOutput(application.native);

        this._flatpak.text = normalizeArrayOutput(application.flatpak);

        this._arguments.text = normalizeArrayOutput(application.arguments);

        this._supports_files.active = application.supports_files || false;

        this._toggleSwitch = new ToggleSwitchClass({
            active: application.enable,
            valign: Gtk.Align.CENTER,
        });

        this.add_suffix(this._toggleSwitch);

        this._name.connect('changed', () => {
            if (settings && typeof application.id === 'number') {
                const input = this._name;
                const val = input.text;
                const result = validate(val, application.id, 'name');

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

        this._native.connect('changed', () => {
            if (settings && typeof application.id === 'number') {
                const input = this._native;
                const val = input.text;
                const result = validate(val, application.id, 'native');

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

        this._flatpak.connect('changed', () => {
            if (settings && typeof application.id === 'number') {
                const input = this._flatpak;
                const val = input.text;
                const result = validate(val, application.id, 'flatpak');

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

        this._arguments.connect('changed', () => {
            this._updateConfig();
        });

        this._supports_files.connect('notify::active', () => {
            this._updateConfig();
        });

        this._toggleSwitch.connect('notify::active', () => {
            this._updateConfig();
        });
    }

    private _updateConfig() {
        const newAppSettings: Application = {
            id: this._id,
            name: normalizeText(this._name.text),
            native: normalizeArray(this._native.text),
            flatpak: normalizeArray(this._flatpak.text),
            arguments: normalizeArray(this._arguments.text),
            supports_files: this._supports_files.active,
            enable: this._toggleSwitch.active,
        };

        this.set_title(newAppSettings.name);

        try {
            setAppSettings(newAppSettings, this._bannerHandler);
        }
        catch (error) {
            console.error('Failed to update application configuration:', error);
        }
    }
}

export const ApplicationList = GObject.registerClass(
    {
        Template: GLib.uri_resolve_relative(
            import.meta.url,
            '../ui/widgets/application-list.ui',
            GLib.UriFlags.NONE,
        ),

        GTypeName: 'ApplicationList',

        InternalChildren: [
            'name',
            'native',
            'flatpak',
            'arguments',
            'supports_files',
        ],
    },
    ApplicationListClass,
);
