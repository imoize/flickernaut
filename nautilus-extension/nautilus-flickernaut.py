import os.path
import gettext
from typing import Optional
from gi.repository import Nautilus, GObject, GLib
from Flickernaut.manager import configured_programs

# Init gettext translations
LOCALE_DIR = os.path.join(
    GLib.get_user_data_dir(),
    "gnome-shell",
    "extensions",
    "flickernaut@imoize.github.io",
    "locale",
)

if not os.path.exists(LOCALE_DIR):
    LOCALE_DIR = None

try:
    gettext.bindtextdomain("flickernaut@imoize.github.io", LOCALE_DIR)
    gettext.textdomain("flickernaut@imoize.github.io")
    _ = gettext.gettext

except Exception as e:
    print(f"Flickernaut: gettext init failed: {e}")
    _ = lambda s: s


class FlickernautExtension(GObject.Object, Nautilus.MenuProvider):
    """Nautilus extension providing IDE/editor or other apps context menu integration."""

    def __init__(self) -> None:
        super().__init__()

    def _get_items(
        self, folder: Nautilus.FileInfo, *, id_prefix: str = "", is_file: bool = False
    ) -> list[Nautilus.MenuItem]:
        """Generate menu items for the given folder/file.

        Args:
            folder: The target folder or file object
            id_prefix: Prefix for menu item IDs
            is_file: Whether the target is a file

        Returns:
            List of menu items to display
        """
        folder_path = folder.get_location().get_path()
        return configured_programs.get_menu_items(
            folder_path, id_prefix=id_prefix, is_file=is_file
        )

    def get_background_items(self, *args) -> list[Nautilus.MenuItem]:
        """Generate menu items for background (directory) clicks."""
        current_folder = args[-1]
        return self._get_items(current_folder)

    def get_file_items(self, *args) -> Optional[list[Nautilus.MenuItem]]:
        """Generate menu items for file selections.

        Returns:
            List of menu items for single selection, None for multiple selections
        """
        selected_files = args[-1]

        # Handle only single file selection
        if not isinstance(selected_files, list) or len(selected_files) != 1:
            return None

        target = selected_files[0]
        if target.is_directory():
            return self._get_items(target, id_prefix="selected.")
        return self._get_items(target, id_prefix="selected.", is_file=True)
