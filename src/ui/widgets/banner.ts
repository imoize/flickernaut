import type Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const banners: Adw.Banner[] = [];

/**
 * Registers an Adw.Banner instance to be managed and shown by this module.
 *
 * @param banner - The Adw.Banner instance to register.
 */
export function registerBanner(banner: Adw.Banner) {
    banners.push(banner);
}

/**
 * Reveals all registered banners.
 */
export function showBanners() {
    for (const banner of banners) {
        banner.title = _('Restart Nautilus to apply changes.');
        banner.button_label = _('Restart');
        banner.tooltip_text = _('Nautilus will be closed and restarted after clicking this button.');
        banner.revealed = true;

        // Disconnect the handler if already connected
        if ((banner as any)._restartHandlerId) {
            banner.disconnect((banner as any)._restartHandlerId);
            delete (banner as any)._restartHandlerId;
        }
        (banner as any)._restartHandlerId = banner.connect('button-clicked', restart);
    }
}

/**
 * Restarts Nautilus when the restart button is clicked.
 */
function restart() {
    const cmd = 'nautilus -q';

    GLib.spawn_command_line_async(cmd);

    for (const banner of banners) {
        banner.revealed = false;

        if ((banner as any)._restartHandlerId) {
            banner.disconnect((banner as any)._restartHandlerId);
            delete (banner as any)._restartHandlerId;
        }
    }
}

/**
 * Cleans up all registered banners.
 */
export function cleanupBanners() {
    for (const banner of banners) {
        if ((banner as any)._restartHandlerId) {
            banner.disconnect((banner as any)._restartHandlerId);
            delete (banner as any)._restartHandlerId;
        }
    }

    banners.length = 0;
}
