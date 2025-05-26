import os.path
import json
from functools import lru_cache
from typing import Any, Optional
from gi.repository import Gio, GLib  # type: ignore
from .logger import get_logger
from .models import Application, AppJsonStruct
from .registry import ApplicationsRegistry

logger = get_logger(__name__)


def parse_app_entry(app: dict) -> Optional[AppJsonStruct]:
    """Helper to validate and map a JSON entry into AppJsonStruct."""
    try:
        # Accept both camelCase and snake_case for compatibility
        return AppJsonStruct(
            id=app.get("id", "").strip(),
            app_id=app.get("app_id", app.get("appId", "")).strip(),
            name=app.get("name", "").strip(),
            pinned=app.get("pinned", False),
            multiple_files=app.get("multiple_files", app.get("multipleFiles", False)),
            multiple_folders=app.get(
                "multiple_folders", app.get("multipleFolders", False)
            ),
            enable=app.get("enable", True),
        )
    except Exception as e:
        logger.error(f"Failed to map app entry: {e}")
        return None


class ApplicationConfigLoader:
    @staticmethod
    @lru_cache(maxsize=1)
    def get_schema_dir() -> str:
        """Return the schema directory path."""
        return os.path.join(
            GLib.get_user_data_dir(),
            "gnome-shell",
            "extensions",
            "flickernaut@imoize.github.io",
            "schemas",
        )

    @staticmethod
    @lru_cache(maxsize=1)
    def get_schema_source() -> Gio.SettingsSchemaSource:
        """Return the GSettings schema source."""
        schema_dir = ApplicationConfigLoader.get_schema_dir()
        schema_source = Gio.SettingsSchemaSource.new_from_directory(
            schema_dir, Gio.SettingsSchemaSource.get_default(), False
        )

        if not schema_source:
            logger.error(f"Failed to load schema source from {schema_dir}")
            return None

        return schema_source

    @staticmethod
    def get_gsettings(key: str) -> Optional[Any]:
        """Retrieve a value from GSettings for any given key."""
        schema_source = ApplicationConfigLoader.get_schema_source()
        if schema_source is None:
            logger.critical("Schema source is None. Cannot read GSettings.")
            return None

        schema = schema_source.lookup("org.gnome.shell.extensions.flickernaut", True)
        if not schema:
            logger.critical(
                f"Schema 'org.gnome.shell.extensions.flickernaut' not found."
            )
            return None

        settings = Gio.Settings.new_full(schema, None, None)
        value = settings.get_value(key).unpack()
        return value

    @staticmethod
    def get_submenu_setting() -> bool:
        """Return True if submenu feature is enabled, else False."""
        value = ApplicationConfigLoader.get_gsettings("submenu")

        if not isinstance(value, bool):
            logger.error(
                f"GSettings key 'submenu' returned unexpected type: {type(value)}"
            )
            return False

        return value

    @staticmethod
    def get_applications() -> ApplicationsRegistry:
        """Load and parse the configured applications from GSettings."""
        try:
            settings = ApplicationConfigLoader.get_gsettings("applications")
            registry = ApplicationsRegistry()

            if not settings:
                logger.warning("No applications found in GSettings")
                return registry

            # sort entries by name before adding to registry
            entries = []

            for value in settings:
                app_dict = None
                try:
                    app_dict = json.loads(value) if isinstance(value, str) else value
                except Exception as e:
                    logger.error(f"Error parsing application entry: {e}", exc_info=True)
                    continue

                schemaKey = parse_app_entry(app_dict)
                if not schemaKey or not schemaKey["enable"]:
                    continue
                entries.append(schemaKey)

            # Sort entries by 'name' (case-insensitive)
            entries = sorted(entries, key=lambda x: x["name"].lower())

            for idx, schemaKey in enumerate(entries, 1):
                logger.debug(f"--- Application Menu Entry {idx} ---")

                for k, v in schemaKey.items():
                    logger.debug(f"{k}: {v!r}")

                application = Application(
                    schemaKey["id"],
                    schemaKey["app_id"],
                    schemaKey["name"],
                    schemaKey["pinned"],
                    schemaKey["multiple_files"],
                    schemaKey["multiple_folders"],
                )

                logger.debug("")

                registry.add_application(application)

            return registry

        except Exception as e:
            logger.critical(f"Fatal error in get_applications: {e}", exc_info=True)
            raise


submenu: bool = ApplicationConfigLoader.get_submenu_setting()
applications_registry: ApplicationsRegistry = ApplicationConfigLoader.get_applications()
