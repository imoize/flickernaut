import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { getSettings } from '../lib/prefs/settings.js';
import { EditorList } from './editors.js';

export const GeneralPage = GObject.registerClass(
    {
        Template: GLib.uri_resolve_relative(
            import.meta.url,
            '../ui/pages/general.ui',
            GLib.UriFlags.NONE,
        ),
        GTypeName: 'General',

        InternalChildren: [
            'banner',
            'editor_group',
        ],
    },
    class extends Adw.PreferencesPage {
        public declare _banner: Adw.Banner;
        private declare _editor_group: Adw.PreferencesGroup;
        private _editors = getSettings();

        constructor() {
            super();

            for (const editor of this._editors) {
                try {
                    if (!editor.name) {
                        console.warn('Skipping editor with no name');
                        continue;
                    }

                    const row = new EditorList(editor, this._banner);
                    this._editor_group.add(row);
                }
                catch (e) {
                    console.error('Failed to create editor row:', e);
                }
            }
        }
    },
);
