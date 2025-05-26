from gettext import gettext as _
from gi.repository import Nautilus, GLib  # type: ignore
from .logger import get_logger
from .launcher import Launcher
from .models import Application

logger = get_logger(__name__)


class ApplicationsRegistry(dict[str, Application]):
    """Registry of configured applications."""

    def __init__(self):
        super().__init__()
        self._menu_cache = {}

    def print_menu_cache(self):
        """Debug: Print all menu cache keys and their sizes."""
        logger.debug("---- Menu Cache Contents ----")
        for k, v in self._menu_cache.items():
            logger.debug(f"Cache key: {k} | Items: {len(v)}")
        logger.debug("---- End of Menu Cache ----")

    def add_application(self, application: Application) -> None:
        self[application.id] = application

    @staticmethod
    def _activate_menu_item(
        item: Nautilus.MenuItem, launcher: Launcher, paths: list[str]
    ) -> None:
        """Callback to activate a menu item and launch the command."""
        try:
            if not launcher:
                logger.error("No valid launcher provided for menu item activation.")
                return
            if not paths:
                logger.error("No paths provided for launcher.")
                return
            if launcher.launch(paths):
                logger.debug(
                    f"Launch succeeded for {launcher.name} with paths: {paths!r}"
                )
                return
            else:
                logger.error(
                    f"All launch methods failed for: {getattr(launcher, 'app_id', 'unknown')}"
                )
        except Exception as e:
            logger.error(f"Error during launching application: {e}")

    def _create_menu_item(
        self,
        application: Application,
        launcher: Launcher,
        paths: list[str],
        id_prefix: str,
        is_file: bool,
    ) -> Nautilus.MenuItem:
        """Create a Nautilus.MenuItem for a given application and launcher."""
        label = (
            _("Open with %s") % application.name
            if is_file
            else _("Open in %s") % application.name
        )

        item = Nautilus.MenuItem.new(
            name=f"Flickernaut::{id_prefix}::{application.id}",
            label=label,
        )

        item.connect("activate", self._activate_menu_item, launcher, paths)
        return item

    def _filter_applications(
        self,
        *,
        is_file: bool,
        selection_count: int = 1,
    ) -> list[Application]:
        """Filter applications based on context and installation status.
        - For single selection: return all installed apps.
        - For multi-select: only apps supporting multiple files/folders.
        """
        filtered: list[Application] = []
        for app in self.values():
            if not app.package.is_installed:
                continue
            if selection_count > 1:
                # Multi-select: filter by support for multiple files/folders
                if is_file and not app.multiple_files:
                    continue
                if not is_file and not app.multiple_folders:
                    continue
            # For single selection, always show if installed
            filtered.append(app)
        return filtered

    def get_menu_items(
        self,
        paths: list[str],
        *,
        id_prefix: str = "",
        is_file: bool = False,
        selection_count: int = 1,
        use_submenu: bool = False,
    ) -> list[Nautilus.MenuItem]:
        """Generate Nautilus menu items for the given paths and context."""
        # Uncomment for debugging cache
        # self.print_menu_cache()

        cache_key = (
            tuple(paths),
            id_prefix,
            is_file,
            selection_count,
            use_submenu,
        )

        if cache_key in self._menu_cache:
            # Uncomment for debugging cache hits
            # logger.debug(f"[CACHE HIT] Menu cache used for key: {cache_key}")
            return self._menu_cache[cache_key]
        # Uncomment for debugging cache misses
        # logger.debug(f"[CACHE MISS] Building menu for key: {cache_key}")

        items: list[Nautilus.MenuItem] = []

        # Separate pinned items and submenu items
        pinned_items: list[Nautilus.MenuItem] = []
        submenu_items: list[Nautilus.MenuItem] = []

        # registry level patch: Convert all paths to uris once, up front
        # uris = [GLib.filename_to_uri(p, None) for p in paths]

        for app in self._filter_applications(
            is_file=is_file, selection_count=selection_count
        ):
            launcher = app.launcher
            if not launcher:
                continue

            item = self._create_menu_item(app, launcher, paths, id_prefix, is_file)

            if use_submenu and app.pinned:
                pinned_items.append(item)
            elif use_submenu:
                submenu_items.append(item)
            else:
                items.append(item)

        if use_submenu:
            result_items = []

            if submenu_items:
                submenu = Nautilus.Menu()

                for item in submenu_items:
                    submenu.append_item(item)

                label = _("Open In...") if not is_file else _("Open With...")

                submenu_item = Nautilus.MenuItem.new(
                    f"Flickernaut::submenu::{id_prefix}", label
                )

                submenu_item.set_submenu(submenu)
                result_items.append(submenu_item)

            result_items.extend(pinned_items)

            if not result_items:
                logger.warning(
                    f"No menu items produced for paths: {paths!r} (is_file={is_file})"
                )

            self._menu_cache[cache_key] = result_items
            return result_items

        if not items:
            logger.warning(
                f"No menu items produced for paths: {paths!r} (is_file={is_file})"
            )

        self._menu_cache[cache_key] = items
        return items
