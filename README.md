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
* fix timezone stuff in tests
-->

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**
* (jens-maus) Update node-ical from 0.26.0 to 0.26.1
- (copilot) Adapter requires node.js >= 22 now

### 1.20.0 (2026-04-07)
* (jens-maus) Replaced axios usage with node.js built-in fetch

### 1.19.8 (2026-04-03)
* (jens-maus) Update node-ical from 0.25.5 to 0.26.0

### 1.19.7 (2026-03-06)
* (jens-maus) Update node-ical from 0.25.4 to 0.25.5
* (jens-maus) Update more general dependencies

### 1.19.6 (2026-02-23)
* (jens-maus) Update node-ical from 0.25.2 to 0.25.4
* (copilot) Adapter requires admin >= 7.7.22 now

### 1.19.5 (2026-02-16)
* (jens-maus) Update node-ical from 0.24.2 to 0.25.2

[Older changelogs can be found there](CHANGELOG_OLD.md)

## License

The MIT License (MIT)


Copyright (c) 2026 iobroker-community-adapters <iobroker-community-adapters@gmx.de>  
Copyright (c) 2014-2025, bluefox <dogafox@gmail.com>

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
