import os.path
import gettext
from typing import Optional
from Flickernaut.logger import get_logger
from gi.repository import Nautilus, GObject, GLib  # type: ignore
from Flickernaut.manager import applications_registry, submenu

logger = get_logger(__name__)

# Init gettext translations
UUID: str = "flickernaut@imoize.github.io"

LOCALE_DIR = os.path.join(
    GLib.get_user_data_dir(),
    "gnome-shell",
    "extensions",
    UUID,
    "locale",
)

if not os.path.exists(LOCALE_DIR):
    logger.warning(f"Locale dir {LOCALE_DIR} not found, disabling translation.")
    LOCALE_DIR = None

try:
    gettext.bindtextdomain(UUID, LOCALE_DIR)
    gettext.textdomain(UUID)
    _ = gettext.gettext

except Exception as e:
    logger.error(f"gettext init failed: {e}")
    _ = lambda s: s


class FlickernautExtension(GObject.Object, Nautilus.MenuProvider):
    """Nautilus extension providing IDE/editor or other apps context menu integration."""

    def __init__(self) -> None:
        super().__init__()

    def _get_items(
        self,
        file_info_or_list: list[Nautilus.FileInfo],
        *,
        id_prefix: str = "",
        is_file: bool = False,
        selection_count: int = 1,
    ) -> list[Nautilus.MenuItem]:
        """Generate menu items for the given file(s) or folder(s)."""
        # paths = [f.get_location().get_path() for f in file_info_or_list]

        # experimental: use get_uri()
        paths = [f.get_uri() for f in file_info_or_list]

        return applications_registry.get_menu_items(
            paths,
            id_prefix=id_prefix,
            is_file=is_file,
            selection_count=selection_count,
            use_submenu=submenu,
        )

    def get_background_items(self, *args) -> list[Nautilus.MenuItem]:
        """Generate menu items for background (directory) clicks."""
        current_folder = args[-1]

        return self._get_items(
            [current_folder], id_prefix="background", is_file=False, selection_count=1
        )

    def get_file_items(self, *args) -> Optional[list[Nautilus.MenuItem]]:
        """Generate menu items for file selections.

        Returns:
            Optional[list[Nautilus.MenuItem]]: List of menu items for single/multi selection, None if not handled.
        """
        selected_files = args[-1]

        if not isinstance(selected_files, list) or not selected_files:
            logger.info("No selection or invalid selection type.")
            return None

        selection_count = len(selected_files)

        if selection_count == 1:
            target = selected_files[0]
            # path = target.get_location().get_path()

            # experimental: use get_uri()
            path = target.get_uri()

            if target.is_directory():
                logger.info(f"Single folder selected: {path}")

                return self._get_items(
                    [target], id_prefix="selected", is_file=False, selection_count=1
                )
            else:
                logger.info(f"Single file selected: {path}")
                return self._get_items(
                    [target], id_prefix="selected", is_file=True, selection_count=1
                )
        else:
            # Multi-select: determine if all are files or all are directories
            # types_and_paths = [
            #     (f.is_directory(), f.get_location().get_path()) for f in selected_files
            # ]
            # types, paths = zip(*types_and_paths)
            # multiple_dirs = all(types)
            # multiple_files = not any(types)

            # experimental : use get_uri()
            types_and_paths = [(f.is_directory(), f.get_uri()) for f in selected_files]
            types, paths = zip(*types_and_paths)
            multiple_dirs = all(types)
            multiple_files = not any(types)

            MAX_MULTIPLE = 5
            if selection_count > MAX_MULTIPLE:
                logger.debug(
                    f"Too many items selected ({selection_count}), max allowed is {MAX_MULTIPLE}."
                )
                return None

            if multiple_dirs:
                logger.info(f"Multiple folders selected: {paths}")

                return self._get_items(
                    selected_files,
                    id_prefix="multiple",
                    is_file=False,
                    selection_count=selection_count,
                )
            elif multiple_files:
                logger.info(f"Multiple files selected: {paths}")

                return self._get_items(
                    selected_files,
                    id_prefix="multiple",
                    is_file=True,
                    selection_count=selection_count,
                )
            else:
                logger.info(
                    f"Invalid multi-selection (mixed files and folders): {paths}"
                )
                return None
