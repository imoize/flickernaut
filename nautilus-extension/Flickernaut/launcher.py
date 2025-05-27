import os
import shlex
from gi.repository import GLib, Gio  # type: ignore
from .logger import get_logger

logger = get_logger(__name__)


class Launcher:
    """Handles launching a desktop application."""

    def __init__(self, app_info: Gio.DesktopAppInfo, app_id: str, name: str) -> None:
        self.app_id = app_id
        self.name = name
        self._app_info = app_info
        self._launch_method = "none"
        self._run_command = ()
        self._commandline = self._get_commandline(app_info)
        self._set_launch_command()

        logger.debug(f"launcher method: {self._launch_method}")
        logger.debug(f"commandline: {self._commandline}")

    def _get_commandline(self, app_info: Gio.DesktopAppInfo) -> list[str]:
        """Get the commandline from the app_info, handling special cases."""
        executable = os.path.basename(app_info.get_executable()) or ""

        bin_path = GLib.find_program_in_path(executable)
        if not bin_path:
            return []

        cmd = app_info.get_commandline() or ""

        # Split commandline into tokens while respecting quotes
        tokens = shlex.split(cmd)

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

    def _set_launch_command(self) -> None:
        """Determine the best launch command for the application."""
        # 1. Try Gio.AppInfo.launch_uris first
        if self._app_info:
            self._launch_method = "gio-launch"
            self._run_command = ()
            return

        # 2. Fallback to gtk-launch if gio-launch is not available
        bin_path = GLib.find_program_in_path("gtk-launch")
        if bin_path and os.path.isfile(bin_path):
            desktop_id = (
                self._app_info.get_id()[:-8]
                if self._app_info.get_id().endswith(".desktop")
                else self._app_info.get_id()
            )
            self._launch_method = "gtk-launch"
            self._run_command = (bin_path, desktop_id)
            return

        # 3. Fallback to commandline if other methods are not available
        if self._commandline:
            self._launch_method = "commandline"
            self._run_command = tuple(self._commandline)
            return

        self._run_command = ()
        self._launch_method = "none"
        self._init_failed = True

    def launch(self, paths: list[str]) -> bool:
        """Launch the application based _launch_method."""
        if self._launch_method == "gio-launch" and self._app_info:
            uris = [GLib.filename_to_uri(path) for path in paths]
            try:
                logger.debug(f"Launching {self.name} with gio-launch: {paths}")
                ctx = None
                self._app_info.launch_uris_async(uris, ctx)
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
        return self._run_command

    def __str__(self) -> str:
        return f"Launcher({self.name}, method={self._launch_method}, cmd={self._run_command})"
