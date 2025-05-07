import Gtk from 'gi://Gtk';

export function createEnableSwitch(
    active: boolean,
    onToggle: (newState: boolean) => void,
): Gtk.Switch {
    const enableSwitch = new Gtk.Switch({
        active,
        valign: Gtk.Align.CENTER,
    });

    enableSwitch.connect('state-set', (_, state) => {
        onToggle(state);
    });

    return enableSwitch;
}
