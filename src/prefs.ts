import type Adw from 'gi://Adw';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { initSettings, uninitSettings } from './lib/prefs/settings.js';
import { ApplicationPage } from './prefs/application.js';
import { GeneralPage } from './prefs/general.js';
import { bannerManager } from './ui/widgets/banner.js';

export default class FlickernautPrefs extends ExtensionPreferences {
    async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        initSettings(this.getSettings());

        window.add(new GeneralPage());
        window.add(new ApplicationPage());

        // Clean up resources when the window is closed
        window.connect('close-request', () => {
            uninitSettings();
            bannerManager.cleanup();
        });

        return Promise.resolve();
    }
}
