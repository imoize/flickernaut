import type { SchemaKey } from '../lib/prefs/settings.js';
import type { BannerHandler } from '../ui/widgets/banner.js';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { getSettings, setSettings } from '../lib/prefs/settings.js';

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
        private declare _schemaKey: typeof SchemaKey;
        private declare _bannerHandler: BannerHandler;

        constructor(schemaKey: typeof SchemaKey, bannerHandler: BannerHandler) {
            super();

            this._schemaKey = schemaKey;
            this._bannerHandler = bannerHandler;
            this._bannerHandler.register(this._banner);

            const state = getSettings(this._schemaKey.submenu).valueOf();

            this._submenu.active = state;

            this._submenu.connect('notify::active', () => {
                setSettings(this._schemaKey.submenu, this._submenu.active, this._bannerHandler);
            });
        }
    },
);
