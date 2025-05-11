import type Gio from 'gi://Gio';
import type { Editor } from '../../../@types/types.js';

/**
 * Global settings object for managing application preferences.
 */
// eslint-disable-next-line import/no-mutable-exports
export let settings: Gio.Settings;

/**
 * Initializes the global settings object.
 *
 * @param gSettings - A `Gio.Settings` instance to be used as the global settings object.
 */
export function initSettings(gSettings: Gio.Settings): void {
    settings = gSettings;
}

/**
 * Retrieves the list of editor configurations from the settings.
 *
 * @returns An array of `Editor` objects parsed from the settings.
 */
export function getSettings(): Editor[] {
    return settings.get_strv('editors')
        .map((json) => {
            try {
                return JSON.parse(json) as Editor;
            }
            catch {
                return null;
            }
        })
        .filter((e): e is Editor => e !== null);
}

/**
 * Updates the settings with a new or modified editor configuration.
 *
 * @param newSettings - The new or updated `Editor` configuration to be saved.
 */
export function setSettings(newSettings: Editor): void {
    const configs = getSettings();
    const newConfigs = configs.map(e =>
        e.id === newSettings.id ? newSettings : e,
    );

    settings.set_strv('editors', newConfigs.map(e => JSON.stringify(e)));
}
