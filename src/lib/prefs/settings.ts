import type Gio from 'gi://Gio';
import type { Editor } from '../../../@types/types.js';

/**
 * Raw GSettings object for direct manipulation.
 */
// eslint-disable-next-line import/no-mutable-exports
export let settings: Gio.Settings;

/**
 * Initializes the GSettings object.
 *
 * @param gSettings - A `Gio.Settings` to initialize the settings with.
 */
export function initSettings(gSettings: Gio.Settings): void {
    settings = gSettings;
}

/**
 * Uninitializes the settings object by setting it to null.
 *
 * This allows the {@link settings} object to be garbage collected and should be called
 * when the settings are no longer needed, such as during extension disable or cleanup.
 */
export function uninitSettings() {
    (settings as Gio.Settings | null) = null;
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
