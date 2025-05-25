import type Adw from 'gi://Adw';
import type { ExtensionMetadata } from 'resource:///org/gnome/shell/extensions/extension.js';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { initSettings, SchemaKey, uninitSettings } from './lib/prefs/settings.js';
import { ApplicationPage } from './prefs/application.js';
import { GeneralPage } from './prefs/general.js';
import { BannerHandler } from './ui/widgets/banner.js';
import { Menu } from './ui/widgets/menu.js';

export default class FlickernautPrefs extends ExtensionPreferences {
    constructor(metadata: ExtensionMetadata) {
        super(metadata);
        const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default() as Gdk.Display);
        const UIFolderPath = `${this.path}/ui`;
        iconTheme.add_search_path(`${UIFolderPath}/icons`);
    }

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
