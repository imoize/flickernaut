import type Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

/**
 * BannerManager handles registration, display, and cleanup of Adw.Banner instances.
 */
class BannerManager {
    private banners: Adw.Banner[] = [];

    /**
     * Register an Adw.Banner instance to be managed.
     * @param banner The Adw.Banner instance to register.
     */
    register(banner: Adw.Banner): void {
        this.banners.push(banner);
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

            // Disconnect previous handler if any
            if ((banner as any)._restartHandlerId) {
                banner.disconnect((banner as any)._restartHandlerId);
                delete (banner as any)._restartHandlerId;
            }
            (banner as any)._restartHandlerId = banner.connect('button-clicked', this._restart.bind(this));
        }
    }

    /**
     * Clean up all banners.
     */
    cleanup(): void {
        for (const banner of this.banners) {
            if ((banner as any)._restartHandlerId) {
                banner.disconnect((banner as any)._restartHandlerId);
                delete (banner as any)._restartHandlerId;
            }
        }
        this.banners.length = 0;
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
            if ((banner as any)._restartHandlerId) {
                banner.disconnect((banner as any)._restartHandlerId);
                delete (banner as any)._restartHandlerId;
            }
        }
    }
}

export const bannerManager = new BannerManager();
