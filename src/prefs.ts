import type Adw from 'gi://Adw';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { initSettings, uninitSettings } from './lib/prefs/settings.js';
import { GeneralPage } from './prefs/general.js';

export default class FlickernautPrefs extends ExtensionPreferences {
    async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        initSettings(this.getSettings());

        window.add(new GeneralPage());

        // Clean up settings when the window is closed
        window.connect('close-request', () => {
            uninitSettings();
        });

        return Promise.resolve();
    }
}
