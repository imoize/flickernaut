import type Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

/**
 * BannerHandler handles registration, display, and cleanup of Adw.Banner instances.
 */
export class BannerHandler {
    private banners: Adw.Banner[] = [];

    /**
     * Register an Adw.Banner instance to be managed.
     * @param banner The Adw.Banner instance to register.
     */
    register(banner: Adw.Banner): void {
        if (!this.banners.includes(banner)) {
            this.banners.push(banner);
        }
    }

    /**
     * Show all registered banners with restart action.
     */
    showAll(): void {
        for (const banner of this.banners) {
            banner.title = _('Restart Nautilus to apply changes.');
            banner.button_label = _('Restart');
            banner.tooltip_text = _('Nautilus will be closed and restarted after clicking this button.');
            banner.revealed = true;

            this._disconnectRestartHandler(banner);

            (banner as any)._restartHandlerId = banner.connect('button-clicked', this._restart.bind(this));
        }
    }

    /**
     * Clean up all banners.
     */
    cleanup(): void {
        for (const banner of this.banners) {
            this._disconnectRestartHandler(banner);
        }
        this.banners.length = 0;
    }

    /**
     * Disconnect and clean up the restart handler from a banner.
     * @param banner The Adw.Banner instance.
     */
    private _disconnectRestartHandler(banner: Adw.Banner): void {
        if ((banner as any)._restartHandlerId) {
            banner.disconnect((banner as any)._restartHandlerId);
            delete (banner as any)._restartHandlerId;
        }
    }

    /**
     * Restart Nautilus and hide all banners.
     * @private
     */
    private _restart(): void {
        const cmd = 'nautilus -q';
        GLib.spawn_command_line_async(cmd);

        for (const banner of this.banners) {
            banner.revealed = false;

            this._disconnectRestartHandler(banner);
        }
    }
}
