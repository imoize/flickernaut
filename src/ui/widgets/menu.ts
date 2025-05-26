import type Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

export class Menu {
    /**
     * Adds a custom menu to the provided Adw.PreferencesWindow instance.
     *
     * This method loads a menu UI definition from a `menu.ui` file, retrieves the
     * `info_menu` object, and inserts it into the window's header bar. It also
     * creates a `Gio.SimpleActionGroup` with actions for opening external links
     * (such as GitHub and Ko-fi) and attaches them to the window.
     *
     * @param window - The Adw.PreferencesWindow to which the menu will be added.
     *
     * @remarks
     * - The method expects a `menu.ui` file to be present and accessible relative to the module URL.
     * - If the menu UI or header bar cannot be found, the method will return early.
     * - The actions added will open external URLs in the user's default browser.
     */
    add(window: Adw.PreferencesWindow) {
        const builder = new Gtk.Builder();
        try {
            builder.add_from_file(GLib.filename_from_uri(
                GLib.uri_resolve_relative(
                    import.meta.url,
                    'menu.ui',
                    GLib.UriFlags.NONE,
                ),
            )[0]);
        }
        catch (e) {
            console.log(`Failed to load menu.ui: ${e}`);
            return;
        }

        const infoMenu = builder.get_object('info_menu') as Gtk.MenuButton | null;
        if (!infoMenu) {
            return;
        }

        const headerbar = this._find(window, ['AdwHeaderBar', 'Adw_HeaderBar']) as Adw.HeaderBar | null;
        if (!headerbar) {
            return;
        }

        (headerbar as any).pack_start(infoMenu);

        const actionGroup = new Gio.SimpleActionGroup();
        window.insert_action_group('prefs', actionGroup);

        const actions = [
            {
                name: 'open-github',
                link: 'https://github.com/imoize/flickernaut',
            },
            {
                name: 'donate-kofi',
                link: 'https://ko-fi.com/brilliantnz',
            },
        ];

        actions.forEach((action) => {
            const act = new Gio.SimpleAction({ name: action.name });
            act.connect('activate', () => {
                Gtk.show_uri(window, action.link, Gdk.CURRENT_TIME);
            });
            actionGroup.add_action(act);
        });
    }

    /**
     * Recursively searches for the first descendant widget of any specified types within a widget tree.
     *
     * @param widget - The root Gtk.Widget to start the search from.
     * @param widgetTypes - An array of widget type names (as strings) to search for.
     * @param depth - (Optional) The current recursion depth, used internally for traversal.
     * @returns The first Gtk.Widget found that matches any of the specified types, or `null` if none are found.
     */
    private _find(widget: Gtk.Widget, widgetTypes: string[], depth = 0): Gtk.Widget | null {
        const widgetType = (widget.constructor as any).name;
        if (widgetTypes.includes(widgetType)) {
            return widget;
        }

        let child = widget.get_first_child?.();
        while (child) {
            const found = this._find(child, widgetTypes, depth + 1);
            if (found) {
                return found;
            }
            child = child.get_next_sibling?.();
        }
        return null;
    }
}
