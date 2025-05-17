import type Gio from 'gi://Gio';
import type { Editor, SchemaType } from '../../../@types/types.js';
import GLib from 'gi://GLib';
import { showBanners } from '../../ui/widgets/banner.js';

/**
 * All existing schema keys.
 */
export type SchemaKey = keyof SchemaType;

/** Mapping of schema keys to GLib Variant type string */
export const SchemaVariant = {
    'settings-version': 'i',
    'submenu': 'b',
    'editors': 'as',
};

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
 * Get a preference from GSettings and convert it from a GLib Variant to a
 * JavaScript type.
 *
 * @param key - The key of the preference to get.
 * @returns The value of the preference.
 */
export function getSettings<K extends SchemaKey>(key: K): SchemaType[K] {
    return settings.get_value(key).recursiveUnpack();
}

/**
 * Pack a value into a GLib Variant type and store it in GSettings.
 *
 * @param key - The key of the preference to set.
 * @param value - The value to set the preference to.
 */
export function setSettings<K extends SchemaKey>(key: K, value: SchemaType[K]) {
    console.log(`Settings pref: ${key}, ${value}`);

    const variant = new GLib.Variant(SchemaVariant[key], value);

    settings.set_value(key, variant);

    showBanners();
}

/**
 * Retrieves the list of application configurations from the settings.
 *
 * @returns An array of `Application` objects parsed from the settings.
 */
export function getAppSettings(): Editor[] {
    return getSettings('editors')
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
 * Updates the settings with a new or modified application configuration.
 *
 * @param newSettings - The new or updated `Application` configuration to be saved.
 */
export function setAppSettings(newSettings: Editor): void {
    const configs = getAppSettings();
    const newConfigs = configs.map(e =>
        e.id === newSettings.id ? newSettings : e,
    );

    setSettings('editors', newConfigs.map(e => JSON.stringify(e)));
}
