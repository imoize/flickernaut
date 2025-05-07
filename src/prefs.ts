import type Gio from 'gi://Gio';
import type { Editor } from '../@types/types.js';
import Adw from 'gi://Adw';
import { gettext as _, ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { createExpanderRow } from './components/ExpanderRow.js';
import { restartNautilus } from './lib/nautilus.js';
import { getConfig, setConfig } from './lib/prefs/settings.js';

export default class FlickernautPrefs extends ExtensionPreferences {
    _settings?: Gio.Settings;
    _shouldRestartNautilus: boolean = false; // Flag to track if Nautilus needs to be restarted

    async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        this._settings = this.getSettings();

        const page = new Adw.PreferencesPage({
        });

        const editorGroup = new Adw.PreferencesGroup({
            title: _('Editor'),
        });

        const editors = getConfig(this._settings);

        for (const editor of editors) {
            try {
                const program = createExpanderRow(editor, (updatedConfig) => {
                    this._updateConfig(updatedConfig);
                }, this._settings);
                editorGroup.add(program);
            }
            catch (e) {
                console.log('Invalid editor JSON:', e);
            }
        }

        page.add(editorGroup);
        window.add(page);

        // Listen for the close-request signal
        window.connect('close-request', () => {
            if (this._shouldRestartNautilus) {
                restartNautilus();
            }
        });

        return Promise.resolve();
    }

    private _updateConfig(updatedConfig: Editor) {
        setConfig(this._settings!, updatedConfig);
        this._shouldRestartNautilus = true;
    }
}
