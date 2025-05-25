"""
nautilus-flickernaut.py - Nautilus extension providing IDE/editor or other apps context menu integration.

A great deal of credit and appreciation is owed to the nautilus-code developers.

https://github.com/realmazharhussain/nautilus-code/blob/main/NautilusCode/types.py
"""

import os
import shlex
from gettext import gettext as _
from typing import Optional, TypedDict
from gi.repository import Nautilus, GLib, Gio  # type: ignore
from .logger import get_logger

logger = get_logger(__name__)


class AppJsonStruct(TypedDict):
    id: str
    app_id: str
    name: str
    pinned: bool
    multiple_files: bool
    multiple_folders: bool
    enable: bool


class Package:
    """Abstract base for application launch packages."""

    def __str__(self) -> str:
        return f"installed = {self.is_installed}"

    @property
    def run_command(self) -> tuple[str, ...]:
        raise NotImplementedError

    @property
    def is_installed(self) -> bool:
        raise NotImplementedError


class Launcher(Package):
    """Represents a launchable desktop application."""

    def __init__(self, app_id: str, name: str) -> None:
        if not app_id or not isinstance(app_id, str):
            logger.error("app_id must be a non-empty string")

            self.app_id = ""
            self.name = ""
            self.commandline = []
            self.installed = False
            self._run_command = ()
            self._launch_method = "none"
            self._init_failed = True
            self._app_info = None
            return

        self.app_id: str = app_id
        self.name: str = name
        self.commandline: list[str] = []
        self.installed: bool = False
        self._run_command: tuple[str, ...] = ()
        self._launch_method: str = "none"
        self._init_failed: bool = False
        self._app_info: Optional[Gio.DesktopAppInfo] = None

        app_info = Gio.DesktopAppInfo.new(app_id)
        if not app_info:
            logger.error(f"Failed to load desktop file for: {app_id}")
            self._init_failed = True
            return

        self._app_info = app_info

        self.installed = self._is_app_installed(app_info)

        self.commandline = self._get_commandline(app_info)

        self._set_launch_command(app_info)

        logger.debug(f"installed: {self.installed}")
        logger.debug(f"launcher method: {self._launch_method}")
        logger.debug(f"commandline: {self.commandline}")

    def _get_commandline(self, app_info: Gio.DesktopAppInfo) -> list[str]:
        """Get the commandline from the app_info, handling special cases."""
        executable = os.path.basename(app_info.get_executable()) or ""

        bin_path = GLib.find_program_in_path(executable)
        if not bin_path:
            return []

        commandline = app_info.get_commandline() or ""

        # Split commandline into tokens while respecting quotes
        tokens = shlex.split(commandline)

        # Placeholder tokens
        placeholders = {
            "%f",
            "%F",
            "%u",
            "%U",
            "%d",
            "%D",
            "%n",
            "%N",
            "%k",
            "%v",
            "%m",
            "%i",
            "%c",
            "%r",
            "@@u",
            "@@",
            "@",
        }
        filtered = [
            t for t in tokens if t not in placeholders and not t.startswith("%")
        ]

        if bin_path and filtered:
            filtered[0] = bin_path

        return filtered

    def _is_app_installed(self, app_info: Gio.DesktopAppInfo) -> bool:
        exec = app_info.get_executable() or ""
        package_type = os.path.basename(exec) if exec else ""

        if package_type == "flatpak":
            logger.debug("package type: flatpak")

            flatpak_dirs = [
                os.path.join(GLib.get_user_data_dir(), "flatpak/exports/bin"),
                "/var/lib/flatpak/exports/bin",
            ]

            bin_name = self.app_id[:-8]
            for bin_dir in flatpak_dirs:
                if os.path.exists(os.path.join(bin_dir, bin_name)):
                    return True
            return False

        elif package_type.endswith(".appimage"):
            logger.debug("package type: appimage")

            if exec and exec.endswith(".appimage"):
                if os.path.exists(exec) and os.access(exec, os.X_OK):
                    return True
            return False

        elif exec:
            logger.debug("package type: native")

            if os.path.isabs(exec):
                if os.path.exists(exec) and os.access(exec, os.X_OK):
                    return True
            else:
                bin_path = GLib.find_program_in_path(exec)
                if (
                    bin_path
                    and os.path.exists(bin_path)
                    and os.access(bin_path, os.X_OK)
                ):
                    return True
            return False

        return False

    def _set_launch_command(self, app_info: Gio.DesktopAppInfo) -> None:
        """Determine the best launch command for the application."""
        # 1. Try Gio.AppInfo.launch_uris first
        if app_info:
            self._launch_method = "gio-launch"
            self._run_command = ()
            return

        # 2. Fallback to gtk-launch if gio-launch is not available
        bin_path = GLib.find_program_in_path("gtk-launch")
        if bin_path and os.path.isfile(bin_path):
            desktop_id = (
                self.app_id[:-8] if self.app_id.endswith(".desktop") else self.app_id
            )
            self._launch_method = "gtk-launch"
            self._run_command = (bin_path, desktop_id)
            return

        # 3. Fallback to commandline if other methods are not available
        if self.commandline:
            self._launch_method = "commandline"
            self._run_command = tuple(self.commandline)
            return

        self._run_command = ()
        self._launch_method = "none"
        self._init_failed = True

    def launch(self, paths: list[str]) -> bool:
        """Launch the application based _launch_method."""
        if self._launch_method == "gio-launch" and self._app_info:
            uris = [GLib.filename_to_uri(p, None) for p in paths]
            try:
                logger.debug(f"Launching {self.name} with gio-launch: {uris}")
                ctx = None
                self._app_info.launch_uris(uris, ctx)
                return True
            except Exception as e:
                logger.error(
                    f"Failed to launch {self.name} with Gio.AppInfo.launch_uris: {e}"
                )
                return False

        elif self._launch_method == "gtk-launch":
            try:
                command = list(self._run_command) + list(paths)
                logger.debug(f"Launching {self.name}: {command}")
                pid, *_ = GLib.spawn_async(command)
                GLib.spawn_close_pid(pid)
                return True
            except Exception as e:
                logger.error(f"Failed to launch {self.name} with gtk-launch: {e}")
                return False

        elif self._launch_method == "commandline":
            try:
                command = list(self._run_command) + list(paths)
                logger.debug(f"Launching {self.name} with commandline: {command}")
                pid, *_ = GLib.spawn_async(command)
                GLib.spawn_close_pid(pid)
                return True
            except Exception as e:
                logger.error(f"Failed to launch {self.name} with commandline: {e}")
                return False

        logger.error(f"No valid launch method for {self.app_id}")
        return False

    @property
    def run_command(self) -> tuple[str, ...]:
        """Get the command to run the application."""
        return self._run_command

    @property
    def is_installed(self) -> bool:
        """Check if the application appears to be installed."""
        return bool(self.installed) and not getattr(self, "_init_failed", False)

    def __str__(self) -> str:
        """String representation for debugging."""
        return f"Launcher({self.app_id}, method={self._launch_method}, cmd={self._run_command})"


class Application:
    """Represents an application entry configured in Flickernaut."""

    def __init__(
        self,
        id: str,
        app_id: str,
        name: str,
        pinned: bool = False,
        multiple_files: bool = False,
        multiple_folders: bool = False,
    ) -> None:
        self.id: str = id
        self.app_id: str = app_id
        self.name: str = name
        self.pinned: bool = pinned
        self.multiple_files: bool = multiple_files
        self.multiple_folders: bool = multiple_folders
        self.package: Optional[Launcher] = None
        try:
            launcher = Launcher(app_id, name)
            if launcher.is_installed:
                self.package = launcher
            else:
                logger.warning(
                    f"Launcher for {app_id} is not installed or not runnable"
                )
        except Exception as e:
            logger.error(f"Failed to initialize launcher for {app_id}: {e}")
            self.package = None

    @property
    def installed_packages(self) -> list[Launcher]:
        return [self.package] if self.package and self.package.is_installed else []


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
                    f"Launch succeeded for {launcher.name} with paths: {paths}"
                )
                return
            else:
                logger.error(f"All launch methods failed for: {launcher.app_id}")
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
            if not any(package.is_installed for package in app.installed_packages):
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
        """Generate Nautilus menu items for the given path and context."""
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

        for app in self._filter_applications(
            is_file=is_file, selection_count=selection_count
        ):
            for launcher in app.installed_packages:
                if not launcher.is_installed:
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
