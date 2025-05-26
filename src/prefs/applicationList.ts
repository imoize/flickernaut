import type Gio from 'gi://Gio';
import type { Application } from '../../@types/types.js';
import type { BannerHandler } from '../ui/widgets/banner.js';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { normalizeArray, normalizeArrayOutput, normalizeText } from '../lib/prefs/normalize.js';
import { setAppSettings } from '../lib/prefs/settings.js';
import { validate } from '../lib/prefs/validation.js';
import { ToggleSwitchClass } from '../ui/widgets/switch.js';

export class ApplicationListClass extends Adw.ExpanderRow {
    private declare _id: string;
    private declare _app_Id: string;
    private declare _name: Adw.EntryRow;
    private declare _icon: string;
    private declare _pinned: boolean;
    private declare _multiple_files: Adw.SwitchRow;
    private declare _multiple_folders: Adw.SwitchRow;
    private declare _packageType: 'Flatpak' | 'AppImage' | 'Native';
    private declare _mime_types: Adw.EntryRow;
    private declare _pin_button: Gtk.Button;
    private declare _toggleSwitch: ToggleSwitchClass;
    private declare _remove_app_button: Gtk.Button;
    private declare _bannerHandler: BannerHandler;

    constructor(settings: Gio.Settings, application: Application, bannerHandler: BannerHandler) {
        super();

        this._bannerHandler = bannerHandler;

        this.title = application.name;

        this.subtitle = application.appId.replace('.desktop', '');

        this._id = application.id;

        this._app_Id = application.appId;

        this._name.text = normalizeText(application.name);

        this._icon = application.icon;

        this._pinned = application.pinned || false;

        this._multiple_files.active = application.multipleFiles || false;

        this._multiple_folders.active = application.multipleFolders || false;

        this._packageType = application.packageType || 'Native';

        this._mime_types.text = normalizeArrayOutput(application.mimeTypes);

        this._toggleSwitch = new ToggleSwitchClass({
            active: application.enable,
            valign: Gtk.Align.CENTER,
        });

        this.add_suffix(this._toggleSwitch);

        this._pin_button = new Gtk.Button({
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
            icon_name: 'view-non-pin-symbolic',
            visible: settings.get_boolean('submenu'),
            tooltip_text: _('Pin in main menu when submenu is enabled.'),
        });

        this.add_suffix(this._pin_button);

        this._name.connect('changed', () => {
            if (settings && typeof application.id === 'string') {
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

                this._updateAppSetting();
            }
        });

        this._multiple_files.connect('notify::active', () => {
            this._updateAppSetting();
        });

        this._multiple_folders.connect('notify::active', () => {
            this._updateAppSetting();
        });

        this._mime_types.connect('changed', () => {
            this._updateAppSetting();
        });

        this._toggleSwitch.connect('notify::active', () => {
            this._updateAppSetting();
        });

        if (this._pinned) {
            this._pin_button.icon_name = 'view-pin-symbolic';
        }

        settings.connect('changed::submenu', () => {
            const submenuState = settings.get_boolean('submenu');
            this._pin_button.visible = submenuState;
        });

        this._pin_button.connect('clicked', () => {
            this._pinned = !this._pinned;

            if (this._pinned) {
                this._pin_button.icon_name = 'view-pin-symbolic';
            }
            else {
                this._pin_button.icon_name = 'view-non-pin-symbolic';
            }
            this._updateAppSetting();
        });

        this._remove_app_button.connect('clicked', () => {
            this.emit('remove-app', application.id);
        });
    }

    private _updateAppSetting() {
        const newAppSettings: Application = {
            id: this._id,
            appId: this._app_Id,
            name: normalizeText(this._name.text),
            icon: this._icon,
            pinned: this._pinned,
            multipleFiles: this._multiple_files.active,
            multipleFolders: this._multiple_folders.active,
            packageType: this._packageType,
            mimeTypes: normalizeArray(this._mime_types.text),
            enable: this._toggleSwitch.active,
        };

        this.set_title(newAppSettings.name);

        try {
            setAppSettings(newAppSettings, this._bannerHandler);
        }
        catch (e) {
            console.error('Failed to update application configuration:', e);
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

        Signals: {
            'remove-app': {
                param_types: [GObject.TYPE_STRING],
            },
        },

        InternalChildren: [
            'name',
            'multiple_files',
            'multiple_folders',
            'mime_types',
            'remove_app_button',
        ],
    },
    ApplicationListClass,
);
