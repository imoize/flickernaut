"""
nautilus-flickernaut.py - Nautilus extension providing IDE/editor or other apps context menu integration.

A great deal of credit and appreciation is owed to the nautilus-code developers.

https://github.com/realmazharhussain/nautilus-code/blob/main/NautilusCode/types.py
"""

import os
from gettext import gettext as _
from typing import Optional
from gi.repository import Nautilus, GLib


class ProgramDict(dict):
    def __iter__(self):
        # Override to iterate over values (Program instances)
        return iter(self.values())

    @property
    def names(self) -> list[str]:
        return list(self.keys())


class Package:
    def __str__(self) -> str:
        return f"{self.type_name}:\n  installed = {self.is_installed}"

    @property
    def type_name(self) -> str:
        return _("Unknown")

    @property
    def type_name_raw(self) -> str:
        return self.__class__.__name__

    @property
    def run_command(self) -> tuple[str, ...]:
        raise NotImplementedError

    @property
    def is_installed(self) -> bool:
        raise NotImplementedError


class Native(Package):
    def __init__(self, *commands: str) -> None:
        self.commands: tuple[str, ...] = commands
        self.cmd_path: str = ""
        self.desktop_id: Optional[str] = None

        for cmd in commands:
            if cmd_path := GLib.find_program_in_path(cmd):
                self.cmd_path = cmd_path
                self.desktop_id = self._find_desktop_id(cmd)
                break

    def _find_desktop_id(self, command_name: str) -> Optional[str]:
        search_dirs: list[str] = [
            os.path.join(GLib.get_user_data_dir(), "applications"),
            *[os.path.join(d, "applications") for d in GLib.get_system_data_dirs()],
        ]

        for dir_path in search_dirs:
            try:
                for file in os.listdir(dir_path):
                    if file.endswith(".desktop"):
                        basename = file[:-8]
                        if "-url-handler" in basename and basename.startswith(
                            command_name
                        ):
                            return command_name
                        elif command_name in basename:
                            return basename
            except FileNotFoundError:
                continue
        return None

    @property
    def run_command(self) -> tuple[str, ...]:
        if self.desktop_id:
            launcher = GLib.find_program_in_path("gtk-launch") or "/usr/bin/gtk-launch"
            return (launcher, self.desktop_id)
        return (self.cmd_path,) if self.cmd_path else ()

    @property
    def is_installed(self) -> bool:
        return bool(self.cmd_path)

    @property
    def type_name(self) -> str:
        return ""


class Flatpak(Package):
    _flatpak_path = GLib.find_program_in_path("flatpak") or ""

    def __init__(self, app_id: str) -> None:
        self.app_id: str = app_id

    @classmethod
    def _get_bin_dirs(cls) -> list[str]:
        dirs = [
            os.path.join(GLib.get_user_data_dir(), "flatpak/exports/bin"),
            "/var/lib/flatpak/exports/bin",
        ]
        return [d for d in dirs if os.path.isdir(d)]

    @property
    def run_command(self) -> tuple[str, ...]:
        return (self._flatpak_path, "run", self.app_id)

    @property
    def is_installed(self) -> bool:
        if not self._flatpak_path:
            return False
        return any(
            os.path.exists(os.path.join(bin_dir, self.app_id))
            for bin_dir in self._get_bin_dirs()
        )

    @property
    def type_name(self) -> str:
        return "Flatpak"


class Program:
    def __init__(
        self,
        id: int,
        name: str,
        *packages: Package,
        arguments: Optional[list[str]] = None,
        supports_files: bool = False,
    ) -> None:
        self.id: int = id
        self.name: str = name
        self.arguments: list[str] = arguments or []
        self.supports_files: bool = supports_files
        self._packages: ProgramDict = ProgramDict()

        for pkg in packages:
            self._packages[pkg.type_name_raw] = pkg

    @property
    def packages(self) -> ProgramDict:
        return self._packages

    @property
    def installed_packages(self) -> list[Package]:
        return [pkg for pkg in self._packages.values() if pkg.is_installed]


class ProgramRegistry(ProgramDict):
    @staticmethod
    def _activate_item(item: Nautilus.MenuItem, command: list[str]) -> None:
        pid, *_ = GLib.spawn_async(command)
        GLib.spawn_close_pid(pid)

    def get_menu_items(
        self, path: str, *, id_prefix: str = "", is_file: bool = False
    ) -> list[Nautilus.MenuItem]:
        items: list[Nautilus.MenuItem] = []

        for program in self:
            if is_file and not program.supports_files:
                continue

            installed = program.installed_packages

            for pkg in installed:
                show_type = len(installed) > 1 and pkg.type_name
                label = _("Open in %s") % program.name
                if show_type:
                    label += f" ({pkg.type_name})"

                item = Nautilus.MenuItem.new(
                    name=f"{id_prefix}program-{program.id}", label=label
                )

                item.connect(
                    "activate",
                    self._activate_item,
                    [*pkg.run_command, *program.arguments, path],
                )

                items.append(item)

        return items

    def __iadd__(self, program: Program) -> "ProgramRegistry":
        self[program.id] = program
        return self
