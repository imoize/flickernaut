"""
nautilus-flickernaut.py - Nautilus extension providing IDE/editor or other apps context menu integration.

A great deal of credit and appreciation is owed to the nautilus-code developers.

https://github.com/realmazharhussain/nautilus-code/blob/main/NautilusCode/types.py
"""

import os
from gettext import gettext as _
from typing import Optional, TypedDict
from gi.repository import GLib, Gio  # type: ignore
from .logger import get_logger
from .launcher import Launcher

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
    """Handles app installation checking."""

    def __init__(self, app_id: str):
        self.app_id = app_id
        self.app_info = Gio.DesktopAppInfo.new(app_id) if app_id else None
        self._is_installed_cache = None

    @property
    def is_installed(self) -> bool:
        if self._is_installed_cache is not None:
            return self._is_installed_cache

        if not self.app_info:
            self._is_installed_cache = False
            return False

        exec = self.app_info.get_executable() or ""
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
                    self._is_installed_cache = True
                    return True
            self._is_installed_cache = False
            return False

        elif package_type.endswith(".appimage"):
            logger.debug("package type: appimage")

            if exec and exec.endswith(".appimage"):
                if os.path.exists(exec) and os.access(exec, os.X_OK):
                    self._is_installed_cache = True
                    return True
            self._is_installed_cache = False
            return False

        elif exec:
            logger.debug("package type: native")

            if os.path.isabs(exec):
                if os.path.exists(exec) and os.access(exec, os.X_OK):
                    self._is_installed_cache = True
                    return True
            else:
                bin_path = GLib.find_program_in_path(exec)
                if (
                    bin_path
                    and os.path.exists(bin_path)
                    and os.access(bin_path, os.X_OK)
                ):
                    self._is_installed_cache = True
                    return True
            self._is_installed_cache = False
            return False

        self._is_installed_cache = False
        return False


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
        self.package = Package(app_id)
        self.launcher: Optional[Launcher] = None
        if self.package.is_installed:
            logger.debug(f"installed: {self.package.is_installed}")
            app_info = self.package.app_info
            try:
                self.launcher = Launcher(app_info, app_id, name) if app_info else None
            except Exception as e:
                logger.error(f"Failed to initialize launcher for {app_id}: {e}")

    def installed_packages(self) -> list[Launcher]:
        # Deprecated: installed_packages property is kept for compatibility
        # but should not be used for is_installed checking.
        return [self.launcher] if self.launcher else []
