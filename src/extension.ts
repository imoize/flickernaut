import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class Flickernaut extends Extension {
    private getFileManagers(): [string, string][] {
        const dataDir = GLib.get_user_data_dir();
        return [
            [`${dataDir}/nautilus-python/extensions`, 'nautilus-flickernaut.py'],
            [`${dataDir}/nautilus-python/extensions`, 'Flickernaut'],
        ];
    }

    /*
    Need to restart Nautilus to load or unload the Nautilus extension
    Nautilus will close when extension is disabled or enabled
    */
    _restartNautilus() {
        try {
            const cmd = 'nautilus -q';
            GLib.spawn_command_line_async(cmd);
        }
        catch (e) {
        }
    }

    enable() {
        const packageDir = this.dir.get_path();
        const targetDir = `${packageDir}/Flickernaut`;
        const targetFile = `${packageDir}/nautilus-flickernaut.py`;

        const fileManagers = this.getFileManagers();

        /*
        Symlink Nautilus extension script to Flickernaut extension directory,
        so it can be enabled or disabled by extension manager
        */
        for (const [dir, name] of fileManagers) {
            const destDir = GLib.build_filenamev([dir, name]);
            const destFile = Gio.File.new_for_path(destDir);

            try {
                if (!destFile.query_exists(null)) {
                    GLib.mkdir_with_parents(dir, 0o755);

                    const source = name.endsWith('.py') ? targetFile : targetDir;
                    const sourceFile = Gio.File.new_for_path(source);

                    if (sourceFile.query_exists(null)) {
                        destFile.make_symbolic_link(source, null);
                    }
                }
            }
            catch (e) {
            }
        }
        this._restartNautilus();
    }

    disable() {
        const fileManagers = this.getFileManagers();

        /*
        Remove symlinks from Nautilus extensions folder,
        to prevent script loaded when extension is disabled
        */
        for (const [dir, name] of fileManagers) {
            try {
                const destDir = GLib.build_filenamev([dir, name]);
                const destFile = Gio.File.new_for_path(destDir);

                if (destFile.query_exists(null)) {
                    GLib.unlink(destDir);
                }
            }
            catch (e) {
            }
        }
        this._restartNautilus();
    }
}
