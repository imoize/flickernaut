from typing import List, Optional
from gi.repository import Nautilus, GObject
from Flickernaut.manager import configured_programs


class FlickernautExtension(GObject.Object, Nautilus.MenuProvider):
    """Nautilus extension providing IDE/editor or other apps context menu integration."""

    def __init__(self):
        super().__init__()

    def _get_items(
        self, folder, *, id_prefix: str = "", is_file: bool = False
    ) -> List[Nautilus.MenuItem]:
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

    def get_background_items(self, *args) -> List[Nautilus.MenuItem]:
        """Generate menu items for background (directory) clicks."""
        current_folder = args[-1]
        return self._get_items(current_folder)

    def get_file_items(self, *args) -> Optional[List[Nautilus.MenuItem]]:
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
