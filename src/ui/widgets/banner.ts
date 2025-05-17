import type Adw from 'gi://Adw';
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
        banner.revealed = true;
    }
}
