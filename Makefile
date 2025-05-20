NAME = flickernaut
UUID = $(NAME)@imoize.github.io

BLP_FILES := $(shell find resources/ui -name '*.blp')
UI_FILES := $(patsubst resources/ui/%.blp,src/ui/%.ui,$(BLP_FILES))

UI_SRC := $(shell find src/ui -name '*.ui')
UI_DST := $(patsubst src/ui/%,dist/ui/%,$(UI_SRC))

.PHONY: all build build-ui pot pot-merge mo pack install test test-shell remove clean

all: pack

node_modules: package.json
	npm install

build: node_modules
	tsc
	@$(MAKE) build-ui

build-ui: $(UI_FILES)

$(UI_FILES): src/ui/%.ui: resources/ui/%.blp
	@mkdir -p $(dir $@)
	@echo "Compiling Blueprint: $< → $@"
	@blueprint-compiler compile $< --output $@

schemas/gschemas.compiled: schemas/org.gnome.shell.extensions.${NAME}.gschema.xml
	glib-compile-schemas schemas

copy-ui: $(UI_DST)

$(UI_DST): dist/ui/%: src/ui/%
	@mkdir -p $(dir $@)
	@cp $< $@

pot:
	@echo "Generating POT file for translations..."
	@xgettext --from-code=UTF-8 \
		--package-name=$(UUID) \
		--output=po/${UUID}.pot \
		src/ui/**/*.ui

	@xgettext --from-code=UTF-8 \
		--package-name=$(UUID) \
		--output=po/${UUID}.pot \
		--join-existing \
		nautilus-extension/**/*.py

	@xgettext --from-code=UTF-8 \
		--package-name=$(UUID) \
		--output=po/${UUID}.pot \
		--language=JavaScript \
		--join-existing \
		$(shell find src -name '*.ts')

pot-merge:
	@echo "Merging translations into existing PO files..."
	@for file in po/*.po; do \
		msgmerge -q -U --backup=off $$file po/${UUID}.pot; \
	done;

mo:
	@echo "Compiling PO files into MO files..."
	@for file in po/*.po; do \
		locale=$$(basename $$file .po); \
		dir="dist/locale/$$locale/LC_MESSAGES"; \
		mkdir -p $$dir; \
		msgfmt -o $$dir/${UUID}.mo $$file; \
	done;

pack: build schemas/gschemas.compiled copy-ui mo
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