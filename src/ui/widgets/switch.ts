import GLib from 'gi://GLib';

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

export class ToggleSwitchClass extends Gtk.Switch {

}

export const ToggleSwitch = GObject.registerClass(
    {
        Template: GLib.uri_resolve_relative(
            import.meta.url,
            'switch.ui',
            GLib.UriFlags.NONE,
        ),
    },
    ToggleSwitchClass,
);
