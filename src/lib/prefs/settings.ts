import type Gio from 'gi://Gio';
import type { Editor } from '../../../@types/types.js';

function getConfig(settings: Gio.Settings): Editor[] {
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

function setConfig(settings: Gio.Settings, updatedConfig: Editor): void {
    const configs = getConfig(settings);
    const newConfigs = configs.map(e =>
        e.id === updatedConfig.id ? updatedConfig : e,
    );

    settings.set_strv('editors', newConfigs.map(e => JSON.stringify(e)));
}

export { getConfig, setConfig };
