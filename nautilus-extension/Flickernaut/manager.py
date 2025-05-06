import os
import json
from functools import lru_cache
from typing import Any
from gi.repository import Gio, GLib
from .models import ProgramRegistry, Program, Native, Flatpak


class ProgramConfigLoader:
    @staticmethod
    @lru_cache(maxsize=1)
    def get_schema_dir() -> str:
        return os.path.join(
            GLib.get_user_data_dir(),
            "gnome-shell",
            "extensions",
            "flickernaut@imoize.github.io",
            "schemas",
        )

    @staticmethod
    def _create_packages(entry: dict[str, Any]) -> list:
        """Create package instances from JSON entry.

        Args:
            entry: Dictionary from JSON containing 'native' and/or 'flatpak' keys

        Returns:
            List of initialized Package objects (Native/Flatpak)
        """
        packages: list = []
        packages.extend(Native(cmd) for cmd in entry.get("native", []))
        packages.extend(Flatpak(app_id) for app_id in entry.get("flatpak", []))
        return packages

    @staticmethod
    def load_from_gsettings() -> ProgramRegistry:
        """Load and parse programs from GNOME settings.

        Returns:
            ProgramRegistry containing all configured programs.
        """
        schema_dir = ProgramConfigLoader.get_schema_dir()

        schema_source = Gio.SettingsSchemaSource.new_from_directory(
            schema_dir, Gio.SettingsSchemaSource.get_default(), False
        )

        if not schema_source:
            raise RuntimeError(f"Failed to load schema source from {schema_dir}")

        schema = schema_source.lookup("org.gnome.shell.extensions.flickernaut", True)

        if not schema:
            raise RuntimeError(
                "Schema 'org.gnome.shell.extensions.flickernaut' not found"
            )

        settings = Gio.Settings.new_full(schema, None, None)
        values = settings.get_strv("editors")

        programs = ProgramRegistry()

        for value in values:
            try:
                entry = json.loads(value)
                if not entry.get("enable", True):
                    continue

                program = Program(
                    int(entry["id"]),
                    entry["name"],
                    *ProgramConfigLoader._create_packages(entry),
                    arguments=entry.get("arguments", []),
                    supports_files=entry.get("supports_files", False),
                )

                programs[program.id] = program
            except (json.JSONDecodeError, KeyError) as e:
                raise RuntimeError(f"Error parsing editor entry: {e}")

        return programs


configured_programs: ProgramRegistry = ProgramConfigLoader.load_from_gsettings()
