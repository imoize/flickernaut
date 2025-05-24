import type Adw from 'gi://Adw';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { initSettings, SchemaKey, uninitSettings } from './lib/prefs/settings.js';
import { ApplicationPage } from './prefs/application.js';
import { GeneralPage } from './prefs/general.js';
import { BannerHandler } from './ui/widgets/banner.js';
import { Menu } from './ui/widgets/menu.js';

export default class FlickernautPrefs extends ExtensionPreferences {
    async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        const menu = new Menu();
        menu.add(window);

        initSettings(this.getSettings());

        const settings = this.getSettings();
        const schemaKey = SchemaKey;
        const bannerHandler = new BannerHandler();

        window.add(new GeneralPage(schemaKey, bannerHandler));
        window.add(new ApplicationPage(settings, bannerHandler));

        // Clean up resources when the window is closed
        window.connect('close-request', () => {
            uninitSettings();
            bannerHandler.cleanup();
        });

        return Promise.resolve();
    }
}
