import type { Application } from '../../@types/types.js';
import type { BannerHandler } from '../ui/widgets/banner.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import { normalizeText } from '../lib/prefs/normalize.js';
import { appHandler, getAppSettings } from '../lib/prefs/settings.js';
import { generateId } from '../lib/prefs/utils.js';
import { ApplicationList } from './applicationList.js';

const AppDialog = GObject.registerClass(
    class AppDialog extends Gtk.AppChooserDialog {
        constructor(parent: Gtk.Window) {
            super({
                transient_for: parent,
                modal: true,
                default_width: 350,
                default_height: 450,
                content_type: 'application/octet-stream',
            });

            this.get_widget().set({
                show_all: true,
                show_other: true,
            });

            this.get_widget().connect('application-selected', this._updateSensitivity.bind(this));
            this._updateSensitivity();
        }

        private _updateSensitivity() {
            const appInfo = this.get_app_info();
            const applications = getAppSettings();

            const isDuplicate = !!appInfo && applications.some(a => a.appId === appInfo.get_id());
            const supportsUris = appInfo?.supports_uris?.() ?? !!appInfo?.supports_uris;
            const supportsFiles = appInfo?.supports_files?.() ?? !!appInfo?.supports_files;

            const isValid = !!appInfo && !isDuplicate && (supportsUris || supportsFiles);
            this.set_response_sensitive(Gtk.ResponseType.OK, isValid);
        }
    },
);

export const ApplicationPage = GObject.registerClass(
    {
        Template: GLib.uri_resolve_relative(
            import.meta.url,
            '../ui/pages/application.ui',
            GLib.UriFlags.NONE,
        ),
        GTypeName: 'Application',

        InternalChildren: [
            'banner',
            'app_group',
            'add_app_button',
        ],
    },
    class extends Adw.PreferencesPage {
        private declare _banner: Adw.Banner;
        private declare _app_group: Adw.PreferencesGroup;
        private declare _add_app_button: Gtk.Button;
        private declare _settings: Gio.Settings;
        private declare _bannerHandler: BannerHandler;
        private declare _applicationsList: Application[];
        private declare _applicationsListUi: Application[];
        private declare _applications: { Row: Adw.ExpanderRow }[];
        private declare _count: number | null;

        constructor(settings: Gio.Settings, bannerHandler: BannerHandler) {
            super();

            this._settings = settings;

            this._bannerHandler = bannerHandler;
            this._bannerHandler.register(this._banner);

            this._applicationsList = [];
            this._applicationsListUi = [];
            this._applications = [];
            this._count = null;

            this._refreshWidgets();
            this._add_app_button.connect('clicked', this._onAddApp.bind(this));
        }

        private _refreshWidgets() {
            const applications = getAppSettings();

            // Clear the ExpanderRow widgets
            this._applicationsList.length = 0;

            applications.forEach((app) => {
                if (!app.appId)
                    return;
                const appInfo = Gio.DesktopAppInfo.new(app.appId);
                if (appInfo) {
                    this._applicationsList.push(app);
                }
            });

            // Sort the applications list by name
            this._applicationsList.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

            // Check if the widgets UI needs to be updated
            if (JSON.stringify(this._applicationsListUi) !== JSON.stringify(this._applicationsList)) {
                // Remove the old widgets
                if (this._count) {
                    for (let i = 0; i < this._count; i++) {
                        this._app_group.remove(this._applications[i].Row);
                    }
                    this._count = null;
                }

                // Build new ExpanderRow widgets with the updated applications list
                if (this._applicationsList.length > 0) {
                    this._applications = [];

                    for (const app of this._applicationsList) {
                        try {
                            if (!app.name) {
                                console.warn('Skipping application with no name');
                                continue;
                            }

                            const row = new ApplicationList(this._settings, app, this._bannerHandler);

                            row.connect('remove-app', (_row, id: string) => {
                                this._onRemoveApp(id);
                            });

                            this._app_group.add(row);

                            if (!this._applications)
                                this._applications = [];

                            this._applications.push({ Row: row });
                        }
                        catch (e) {
                            console.error('Failed to create application row:', e);
                        }
                    }

                    this._count = this._applicationsList.length;
                }

                // Update the UI
                this._applicationsListUi = [...this._applicationsList];
            }
            return 0;
        }

        private _onAddApp() {
            const dialog = new AppDialog(this.get_root() as Gtk.Window);

            dialog.connect('response', (_source, id) => {
                const appInfo = id === Gtk.ResponseType.OK ? dialog.get_app_info() : null;

                const applications = getAppSettings();

                if (appInfo && !applications.some(app => app.appId === appInfo.get_id())) {
                    const mimeTypes = Array.from(appInfo.get_supported_types?.() ?? []);

                    const app: Application = {
                        id: generateId(),
                        appId: appInfo.get_id() ?? '',
                        name: normalizeText(appInfo.get_name() ?? ''),
                        icon: appInfo.get_icon()?.to_string() ?? '',
                        pinned: false,
                        multipleFiles: false,
                        multipleFolders: false,
                        mimeTypes,
                        enable: true,
                    };

                    try {
                        appHandler('add', app, this._bannerHandler);
                    }
                    catch (e) {
                        console.error('Failed to add new application:', e);
                    }

                    this._refreshWidgets();
                }
                dialog.destroy();
            });
            dialog.show();
        }

        private _onRemoveApp(id: string) {
            appHandler('remove', id, this._bannerHandler);
            this._refreshWidgets();
        }
    },
);
