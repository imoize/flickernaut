import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { getAppSettings } from '../lib/prefs/settings.js';
import { bannerManager } from '../ui/widgets/banner.js';
import { ApplicationList } from './applicationList.js';

export const ApplicationPage = GObject.registerClass(
    {
        Template: GLib.uri_resolve_relative(
            import.meta.url,
            '../ui/pages/application.ui',
            GLib.UriFlags.NONE,
        ),
        GTypeName: 'Application',

        InternalChildren: [
            'banner',
            'app_group',
        ],
    },
    class extends Adw.PreferencesPage {
        private declare _banner: Adw.Banner;
        private declare _app_group: Adw.PreferencesGroup;

        constructor() {
            super();

            bannerManager.register(this._banner);

            const applications = getAppSettings();

            for (const application of applications) {
                try {
                    if (!application.name) {
                        console.warn('Skipping application with no name');
                        continue;
                    }

                    this._app_group.add(new ApplicationList(application));
                }
                catch (e) {
                    console.error('Failed to create application row:', e);
                }
            }
        }
    },
);
