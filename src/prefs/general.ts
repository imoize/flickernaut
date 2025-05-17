import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { getSettings, setSettings } from '../lib/prefs/settings.js';
import { registerBanner } from '../ui/widgets/banner.js';

export const GeneralPage = GObject.registerClass(
    {
        Template: GLib.uri_resolve_relative(
            import.meta.url,
            '../ui/pages/general.ui',
            GLib.UriFlags.NONE,
        ),
        GTypeName: 'General',

        InternalChildren: [
            'banner',
            'behavior',
            'submenu',
        ],
    },
    class extends Adw.PreferencesPage {
        private declare _banner: Adw.Banner;
        private declare _behavior: Adw.PreferencesGroup;
        private declare _submenu: Adw.SwitchRow;

        constructor() {
            super();

            registerBanner(this._banner);

            const state = getSettings('submenu').valueOf();

            this._submenu.active = state;

            this._submenu.connect('notify::active', () => {
                setSettings('submenu', this._submenu.active);
            });
        }
    },
);
