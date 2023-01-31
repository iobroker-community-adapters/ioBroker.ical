![Logo](admin/ical.png)
# ioBroker.ical

![Number of Installations](http://iobroker.live/badges/ical-installed.svg)
![Number of Installations](http://iobroker.live/badges/ical-stable.svg)
[![NPM version](http://img.shields.io/npm/v/iobroker.ical.svg)](https://www.npmjs.com/package/iobroker.ical)

![Test and Release](https://github.com/iobroker-community-adapters/ioBroker.ical/workflows/Test%20and%20Release/badge.svg)
[![Translation status](https://weblate.iobroker.net/widgets/adapters/-/ical/svg-badge.svg)](https://weblate.iobroker.net/engage/adapters/?utm_source=widget)
[![Downloads](https://img.shields.io/npm/dm/iobroker.ical.svg)](https://www.npmjs.com/package/iobroker.ical)

This adapter allows to read .ics files from specific URL and parse it (Google Calendar or iCal). 
Alternatively it is possible to use a local `.ics` file (use absolute path to the file instead of URL)

**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

## Documentation

[🇺🇸 Documentation](./docs/en/README.md)

[🇩🇪 Dokumentation](./docs/de/README.md)

## Todo
* `data.trigger` doesn't support `check` option
* fix timezone stuff in tests

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->

### **WORK IN PROGRESS**
* (klein0r) Use color picker in adapter settings
* (klein0r) Dropped Admin 4 UI
* (klein0r) Added Ukranian language

### 1.13.2 (2022-08-29)
* (Apollon77) fix strange log messages by downgrading RRule again

### 1.13.1 (2022-06-27)
* (klein0r) Changed request library

### 1.13.0 (2022-06-17)
* (klein0r) Added Admin 5 UI
* (klein0r) Translated all object names

### 1.12.2 (2022-06-03)
* (Apollon77) Fix displaying rest-time of event in one case

### 1.12.1 (2022-03-22)
* (Apollon77) Adjust colorize of dates to also show dates started in the past with todays color

## License

The MIT License (MIT)

Copyright (c) 2014-2022, bluefox <dogafox@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
