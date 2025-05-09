NAME = flickernaut
UUID = $(NAME)@imoize.github.io

BLP_FILES := $(shell find resources/ui -name '*.blp')
UI_FILES := $(patsubst resources/ui/%.blp,dist/ui/%.ui,$(BLP_FILES))

.PHONY: all build build-ui pack install test test-shell remove clean

all: pack

node_modules: package.json
	npm install

build: node_modules
	tsc
	@$(MAKE) build-ui

build-ui: $(UI_FILES)

$(UI_FILES): dist/ui/%.ui: resources/ui/%.blp
	@mkdir -p $(dir $@)
	@echo "Compiling Blueprint: $< → $@"
	@blueprint-compiler compile $< --output $@

schemas/gschemas.compiled: schemas/org.gnome.shell.extensions.${NAME}.gschema.xml
	glib-compile-schemas schemas


pack: build schemas/gschemas.compiled
	@cp metadata.json dist/
	@cp -r schemas dist/
	@cp -r nautilus-extension/* dist/
	@(cd dist && zip ../$(UUID).shell-extension.zip -9r .)

install: pack
	gnome-extensions install -f $(UUID).shell-extension.zip

test: pack
	@rm -rf $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
	@cp -r dist $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
	gnome-extensions prefs $(UUID)

test-shell:
	@env GNOME_SHELL_SLOWDOWN_FACTOR=2 \
		MUTTER_DEBUG_DUMMY_MODE_SPECS=1500x1000 \
		MUTTER_DEBUG_DUMMY_MONITOR_SCALES=1 \
		dbus-run-session -- gnome-shell --nested --wayland

remove:
	@rm -rf $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

clean:
	@rm -rf dist $(UUID).shell-extension.zip
	@rm -rf schemas/gschemas.compiled