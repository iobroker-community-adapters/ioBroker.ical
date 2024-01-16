![Logo](admin/ical.png)
# ioBroker.ical

![Number of Installations](http://iobroker.live/badges/ical-installed.svg)
![Number of Installations](http://iobroker.live/badges/ical-stable.svg)
[![NPM version](http://img.shields.io/npm/v/iobroker.ical.svg)](https://www.npmjs.com/package/iobroker.ical)

![Test and Release](https://github.com/iobroker-community-adapters/ioBroker.ical/workflows/Test%20and%20Release/badge.svg)
[![Translation status](https://weblate.iobroker.net/widgets/adapters/-/ical/svg-badge.svg)](https://weblate.iobroker.net/engage/adapters/?utm_source=widget)
[![Downloads](https://img.shields.io/npm/dm/iobroker.ical.svg)](https://www.npmjs.com/package/iobroker.ical)

ioBroker.ical is an adapter for the ioBroker automation platform focusing on iCalendar files, widely used for storing and sharing calendar data. It allows users to read and parse iCalendar files locally or from a specified URL.  

With ioBroker.ical, you can perform various actions based on calendar events, such as triggering smart home devices, sending notifications, or executing specific scripts or routines. For example, you could create automation rules that turn on the lights when a particular event is about to start or send a reminder notification for an upcoming appointment.  

Sentry reporting, starting with js-controller 3.0, means that this adapter can use Sentry libraries to report exceptions and code errors to developers automatically. For more details and how to disable error reporting, see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry). 

## Documentation

[🇺🇸 Documentation](./docs/en/README.md)

[🇩🇪 Dokumentation](./docs/de/README.md)

<!-- 
## Todo
* `data.trigger` doesn't support `check` option
* fix timezone stuff in tests
-->

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**
* (klein0r) Create dummy file in files tab

### 1.14.0 (2024-01-07)
* (klein0r) Allow to set custom http user agent
* (klein0r) Added option to use files tab for calendar files

### 1.13.6 (2023-12-25)
* (mcm1957) Incorrect jsonConfig has been fixed [#602]
* (mcm1957) Dependencies have been updated

### 1.13.5 (2023-12-15)
* (jens-maus) updated node-ical to latest 0.17.1

### 1.13.4 (2023-12-10)
* (jens-maus) updated node-ical to latest 0.17.0
* (jens-maus) updated dependencies

### 1.13.3 (2023-06-20)
* (jens-maus) updated node-ical to latest 0.16.1
* (klein0r) Use color picker in adapter settings
* (klein0r) Dropped Admin 4 UI
* (klein0r) Added Ukrainian language

## License

The MIT License (MIT)

Copyright (c) 2014-2024, bluefox <dogafox@gmail.com>

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
