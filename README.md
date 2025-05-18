# GNOME Shell Extension - Flickernaut

[<img src="assets/get_it_on_gnome_extensions.png" height="70">](https://extensions.gnome.org/extension/8101/flickernaut/)

A GNOME extension that adds custom entry to Nautilus context menu for your installed dev tools, IDEs, and custom apps.

<p align="center">
    <img src="assets/preview1.png" alt="Flickernaut Preview" style="width: 49%;" />
    <img src="assets/preview2.png" alt="Flickernaut Preview" style="width: 49%;" />
</p>

## Participate

### Translations

You can help to translate the extension into your language, either by directly opening a pull request with the additions you've made, or by using [Weblate](https://hosted.weblate.org/engage/flickernaut).

[![Translation status](https://hosted.weblate.org/widget/flickernaut/multi-auto.svg)](https://hosted.weblate.org/engage/flickernaut/)

### Development

This extension is developed using **TypeScript** and **Python** for Nautilus part. Make sure you have Node.js, npm and tsc installed to build the TypeScript sources.

Install the extension from source:

```bash
git clone https://github.com/imoize/flickernaut
cd flickernaut
make install
```

Then reload GNOME shell, for example by login and logout again, or under Xorg, alt+f2 and type r.

If using wayland without logout and login again, use nested wayland session:

```bash
make test-shell
```

To see extension log:

```bash
# for logs in the extension's preferences
journalctl -o cat -f /usr/bin/gjs
# or
journalctl /usr/bin/gjs | grep flickernaut

# for logs in nautilus
journalctl -o cat -f /usr/bin/nautilus
# or
journalctl /usr/bin/nautilus | grep flickernaut
```
