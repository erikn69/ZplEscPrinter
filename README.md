# ZplPrinter

Printer emulator for zpl rendering engine. The emulator is based on the [labelary](http://labelary.com/service.html) web service. You can configure print density, label size and the tcp server to listen for any incoming labels.

[Releases](https://github.com/erikn69/ZplPrinter/releases/latest)

## New in Version 2.0

The app now runs standalone via Electron and can be installed via the binaries/zips on the GitHub Releases page. It currently supports:

* Windows:
  * Squarrel installer (zpl-printer-**version**-win32-**arch**-setup.exe)
  * Portable runner (zpl-printer-portable-**version**.exe)
  * NuGet package (zpl-printer-**version**-full.nupkg)
  * msi installer (TODO)
* Linux:
  * Rpm (zpl-printer-**version**.**arch**.rpm)
  * Deb (zpl-printer\_**version**\_**arch**.deb)
  * Zip (Zpl.Printer-linux-**arch**-**version**.zip)
* Mac:
  * Zip (Zpl.Printer-darwin-**arch**-**version**.zip)

## References
* [ZPL Command Support](http://labelary.com/docs.html)
* [ZPL Web Service](http://labelary.com/service.html)
* [Electron](https://www.electronjs.org)
* [Electron Forge](https://www.electronforge.io)

## Release notes

### Version 2.2
* **Refactor** Reworked code
* **Upgrade** Bump dependencies

### Version 2.1
* **Refactor** Reworked entire app
* **Fix** Save labels
* **New** Support raw text file on save labels
* **New** Support pixels for width/height

### Version 2.0
* **Refactor** Reworked entire app to run in an Electron app instead of the Chrome Plugin API

### Version 1.6
* **Fix** PDF label export.
* **New** TCP input buffer size can be configure in settings.

### Version 1.5

* **New** Support to print multiple labels in one request.
* **New** Optional setting to keep tcp connection alive.

### Version 1.4.1

* **Fix** Minor fixes

### Version 1.4

* **New** Ability to save labels as image (PNG) or as PDF. (Thanks to [Derek Preston](https://plus.google.com/116997222122087717848/posts))

### Version 1.3

* **Change** Labelary web service call from GET to POST to support large ZPL templates. (Thanks to [pitufo](https://github.com/sbinkert/ZplPrinter/issues/1))

### Contributing

checkout the project. run `yarn install`. use `yarn start` to run in development mode and use `yarn make` to generate binaries for your OS

