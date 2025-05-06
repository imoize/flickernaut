import GLib from 'gi://GLib';

export function restartNautilus() {
    try {
        const cmd = 'nautilus -q';
        GLib.spawn_command_line_async(cmd);
    }
    catch (e) {
        log(`Failed to restart Nautilus: ${e}`);
    }
}
