import type Gio from 'gi://Gio';
import type { Application, SchemaType } from '../../../@types/types.js';
import type { BannerHandler } from '../../ui/widgets/banner.js';
import GLib from 'gi://GLib';

/**
 * All existing schema keys.
 */
export const SchemaKey = {
    applications: 'applications',
    settingsVersion: 'settings-version',
    submenu: 'submenu',
} as const;

/**
 * Maps each key from the `SchemaKey` type to its corresponding schema variant identifier.
 *
 * The values represent the type of schema variant:
 * - `'as'`: Application schema
 * - `'u'`: Unsigned integer schema (e.g., version)
 * - `'b'`: Boolean schema (e.g., submenu)
 *
 * @remarks
 * This record ensures type safety by restricting keys to those defined in `SchemaKey`.
 */
const SchemaVariant: Record<(typeof SchemaKey)[keyof typeof SchemaKey], string> = {
    'applications': 'as',
    'settings-version': 'u',
    'submenu': 'b',
} as const;

/**
 * Raw GSettings object.
 */
let settings: Gio.Settings;

/**
 * Initializes the GSettings object.
 *
 * @param gSettings - A `Gio.Settings` to initialize the settings with.
 */
export function initSettings(gSettings: Gio.Settings): void {
    migrateSettings(gSettings);
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
 * Migrates the application settings to the latest version if necessary.
 *
 * This function checks the current version of the settings stored in `Gio.Settings`.
 * If the settings are outdated (i.e., the stored version is less than the required `lastVersion`),
 * it performs necessary migration steps, such as resetting deprecated keys,
 * and updates the settings version to the latest.
 *
 * @param settings - The `Gio.Settings` instance containing the application's settings.
 */
function migrateSettings(settings: Gio.Settings) {
    const lastVersion = 2;
    const currentVersion = settings
        .get_user_value(SchemaKey.settingsVersion)
        ?.recursiveUnpack();

    if (!currentVersion || currentVersion < lastVersion) {
        if (settings.list_keys().includes('editors')) {
            settings.reset('editors');
        }
        settings.set_uint(SchemaKey.settingsVersion, lastVersion);
    }
}

/**
 * Retrieves the settings value associated with the specified key.
 *
 * @template K - A key that extends the keys of the `SchemaKey` object.
 * @param key - The key used to look up the corresponding schema value.
 * @returns The unpacked value of the setting associated with the given key,
 *          with the type inferred from the `SchemaType` mapping.
 */
export function getSettings<K extends keyof typeof SchemaKey>(key: K): SchemaType[K] {
    const schemaKey = SchemaKey[key];
    return settings.get_value(schemaKey).recursiveUnpack();
}

/**
 * Sets a setting value in the application's settings schema.
 *
 * @typeParam K - The key of the setting, constrained to the keys of `SchemaKey`.
 * @param key - The key of the setting to update.
 * @param value - The value to set for the specified key, matching the type defined in `SchemaType[K]`.
 * @param bannerHandler - Optional handler to display a banner after the setting is updated.
 *
 * This function retrieves the schema key and variant type for the provided key,
 * creates a new `GLib.Variant` with the specified value, and updates the setting.
 * If a `bannerHandler` is provided, it will trigger the display of all banners.
 */
export function setSettings<K extends keyof typeof SchemaKey>(key: K, value: SchemaType[K], bannerHandler?: BannerHandler) {
    const schemaKey = SchemaKey[key];
    const variantType = SchemaVariant[schemaKey];

    const variant = new GLib.Variant(variantType, value);
    settings.set_value(schemaKey, variant);

    if (bannerHandler)
        bannerHandler.showAll();
}

/**
 * Retrieves the list of application settings from the 'applications' key.
 *
 * This function fetches the settings, parses each JSON string into an `Application` object,
 * and filters out any invalid or unparsable entries.
 *
 * @returns {Application[]} An array of valid `Application` objects.
 */
export function getAppSettings(): Application[] {
    return getSettings('applications')
        .map((json) => {
            try {
                return JSON.parse(json) as Application;
            }
            catch (e) {
                console.error(`Failed to parse application entry:`, json, e);
                return null;
            }
        })
        .filter((app): app is Application => app !== null);
}

/**
 * Updates the application settings by replacing the existing configuration
 * with the provided `newAppSettings` for the matching application ID.
 * Persists the updated settings using the `setSettings` function.
 *
 * @param newAppSettings - The updated application settings to be saved.
 * @param bannerHandler - Optional handler for displaying banners or notifications.
 */
export function setAppSettings(newAppSettings: Application, bannerHandler?: BannerHandler): void {
    const appSettings = getAppSettings();
    const idx = appSettings.findIndex(app => app.id === newAppSettings.id);
    if (idx === -1) {
        return;
    }
    const newSettings = appSettings.map(app =>
        app.id === newAppSettings.id ? newAppSettings : app,
    );
    setSettings('applications', newSettings.map(app => JSON.stringify(app)), bannerHandler);
}

/**
 * Handles adding or removing an application from the application settings.
 *
 * @param action - The action to perform: `'add'` to add a new application, or `'remove'` to remove an existing one.
 * @param app - The application to add (as an `Application` object) or the application ID to remove (as a `string`).
 * @param bannerHandler - Optional handler for displaying banners or notifications after the operation.
 *
 * @remarks
 * - When adding, the function checks for duplicates based on `id` or `appId` before adding.
 * - When removing, the function filters out the application with the matching `id`.
 * - Updates the settings by serializing the application list and invoking `setSettings`.
 */
export function appHandler(
    action: 'add' | 'remove',
    app: Application | string,
    bannerHandler?: BannerHandler,
): void {
    const appSettings = getAppSettings();

    let newAppList: Application[];

    if (action === 'add' && typeof app === 'object') {
        if (appSettings.some(a => a.id === app.id || a.appId === app.appId)) {
            return;
        }
        newAppList = [...appSettings, app];
    }

    else if (action === 'remove' && typeof app === 'string') {
        newAppList = appSettings.filter(a => a.id !== app);
    }

    else {
        return;
    }

    setSettings('applications', newAppList.map(a => JSON.stringify(a)), bannerHandler);
}
