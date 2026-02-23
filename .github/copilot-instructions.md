# ioBroker Adapter Development with GitHub Copilot

**Version:** 0.5.6
**Template Source:** https://github.com/DrozmotiX/ioBroker-Copilot-Instructions

This file contains instructions and best practices for GitHub Copilot when working on ioBroker adapter development.

---

## 📑 Table of Contents

1. [Project Context](#project-context)
2. [Code Quality & Standards](#code-quality--standards)
   - [Code Style Guidelines](#code-style-guidelines)
   - [ESLint Configuration](#eslint-configuration)
3. [Testing](#testing)
   - [Unit Testing](#unit-testing)
   - [Integration Testing](#integration-testing)
   - [API Testing with Credentials](#api-testing-with-credentials)
4. [Development Best Practices](#development-best-practices)
   - [Dependency Management](#dependency-management)
   - [HTTP Client Libraries](#http-client-libraries)
   - [Error Handling](#error-handling)
5. [Admin UI Configuration](#admin-ui-configuration)
   - [JSON-Config Setup](#json-config-setup)
   - [Translation Management](#translation-management)
6. [Documentation](#documentation)
   - [README Updates](#readme-updates)
   - [Changelog Management](#changelog-management)
7. [CI/CD & GitHub Actions](#cicd--github-actions)
   - [Workflow Configuration](#workflow-configuration)
   - [Testing Integration](#testing-integration)

---

## Project Context

You are working on an ioBroker adapter. ioBroker is an integration platform for the Internet of Things, focused on building smart home and industrial IoT solutions. Adapters are plugins that connect ioBroker to external systems, devices, or services.

### iCal Adapter Specific Context

This is the **iCal adapter** for ioBroker, which provides calendar integration functionality:

- **Primary Purpose**: Read and parse iCalendar (.ics) files from URLs or local files
- **Key Features**:
  - Fetch calendar data from various sources (Google Calendar, Apple iCloud, NextCloud, etc.)
  - Parse recurring events using RRule library
  - Generate HTML, text, and structured data outputs
  - Trigger automations based on calendar events
  - Support custom user events and filtering
- **Target Systems**: Any CalDAV-compatible calendar system or .ics file source
- **Main Dependencies**:
  - `node-ical`: Core iCalendar parsing
  - `axios`: HTTP requests for remote calendar fetching
  - `rrule`: Recurring event calculations
  - `cloneextend`: Object manipulation utilities
- **Configuration Requirements**:
  - Calendar URLs with optional authentication
  - Preview/past days settings
  - Event filtering and color coding
  - Custom user agent support
- **Data Flow**: Fetch .ics → Parse events → Generate outputs → Update ioBroker states

---

## Code Quality & Standards

### Code Style Guidelines

- Follow JavaScript/TypeScript best practices
- Use async/await for asynchronous operations
- Implement proper resource cleanup in `unload()` method
- Use semantic versioning for adapter releases
- Include proper JSDoc comments for public methods

**Timer and Resource Cleanup Example:**
```javascript
private connectionTimer?: NodeJS.Timeout;

async onReady() {
  this.connectionTimer = setInterval(() => this.checkConnection(), 30000);
}

onUnload(callback) {
  try {
    if (this.connectionTimer) {
      clearInterval(this.connectionTimer);
      this.connectionTimer = undefined;
    }
    callback();
  } catch (e) {
    callback();
  }
}
```

### ESLint Configuration

**CRITICAL:** ESLint validation must run FIRST in your CI/CD pipeline, before any other tests. This "lint-first" approach catches code quality issues early.

#### Setup
```bash
npm install --save-dev eslint @iobroker/eslint-config
```

#### Configuration (.eslintrc.json)
```json
{
  "extends": "@iobroker/eslint-config",
  "rules": {
    // Add project-specific rule overrides here if needed
  }
}
```

#### Package.json Scripts
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

#### Best Practices
1. ✅ Run ESLint before committing
2. ✅ Use `lint:fix` for auto-fixable issues
3. ✅ Don't disable rules without documentation
4. ✅ Lint all relevant files (main code, tests, build scripts)
5. ✅ Keep `@iobroker/eslint-config` up to date

#### Common Issues
- **Unused variables**: Remove or prefix with underscore (`_variable`)
- **Missing semicolons**: Run `npm run lint:fix`
- **Indentation**: Use 4 spaces (ioBroker standard)
- **console.log**: Replace with `adapter.log.debug()` or remove

---

## Testing

### Unit Testing

- Use Jest as the primary testing framework
- Create tests for all adapter main functions and helper methods
- Test error handling scenarios and edge cases
- Mock external API calls and hardware dependencies
- For adapters connecting to APIs/devices not reachable by internet, provide example data files

**Example Structure:**
```javascript
describe('AdapterName', () => {
  let adapter;
  
  beforeEach(() => {
    // Setup test adapter instance
  });
  
  test('should initialize correctly', () => {
    // Test adapter initialization
  });
});
```

### Integration Testing

**CRITICAL:** Use the official `@iobroker/testing` framework. This is the ONLY correct way to test ioBroker adapters.

**Official Documentation:** https://github.com/ioBroker/testing

#### Framework Structure

**✅ Correct Pattern:**
```javascript
const path = require('path');
const { tests } = require('@iobroker/testing');

tests.integration(path.join(__dirname, '..'), {
    defineAdditionalTests({ suite }) {
        suite('Test adapter with specific configuration', (getHarness) => {
            let harness;

            before(() => {
                harness = getHarness();
            });

            it('should configure and start adapter', function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        // Get adapter object
                        const obj = await new Promise((res, rej) => {
                            harness.objects.getObject('system.adapter.your-adapter.0', (err, o) => {
                                if (err) return rej(err);
                                res(o);
                            });
                        });
                        
                        if (!obj) return reject(new Error('Adapter object not found'));

                        // Configure adapter
                        Object.assign(obj.native, {
                            position: '52.520008,13.404954',
                            createHourly: true,
                        });

                        harness.objects.setObject(obj._id, obj);
                        
                        // Start and wait
                        await harness.startAdapterAndWait();
                        await new Promise(resolve => setTimeout(resolve, 15000));

                        // Verify states
                        const stateIds = await harness.dbConnection.getStateIDs('your-adapter.0.*');
                        
                        if (stateIds.length > 0) {
                            console.log('✅ Adapter successfully created states');
                            await harness.stopAdapter();
                            resolve(true);
                        } else {
                            reject(new Error('Adapter did not create any states'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            }).timeout(40000);
        });
    }
});
```

#### Testing Success AND Failure Scenarios

**IMPORTANT:** For every "it works" test, implement corresponding "it fails gracefully" tests.

**Failure Scenario Example:**
```javascript
it('should NOT create daily states when daily is disabled', function () {
    return new Promise(async (resolve, reject) => {
        try {
            harness = getHarness();
            const obj = await new Promise((res, rej) => {
                harness.objects.getObject('system.adapter.your-adapter.0', (err, o) => {
                    if (err) return rej(err);
                    res(o);
                });
            });
            
            if (!obj) return reject(new Error('Adapter object not found'));

            Object.assign(obj.native, {
                createDaily: false, // Daily disabled
            });

            await new Promise((res, rej) => {
                harness.objects.setObject(obj._id, obj, (err) => {
                    if (err) return rej(err);
                    res(undefined);
                });
            });

            await harness.startAdapterAndWait();
            await new Promise((res) => setTimeout(res, 20000));

            const stateIds = await harness.dbConnection.getStateIDs('your-adapter.0.*');
            const dailyStates = stateIds.filter((key) => key.includes('daily'));
            
            if (dailyStates.length === 0) {
                console.log('✅ No daily states found as expected');
                resolve(true);
            } else {
                reject(new Error('Expected no daily states but found some'));
            }

            await harness.stopAdapter();
        } catch (error) {
            reject(error);
        }
    });
}).timeout(40000);
```

#### iCal-Specific Integration Tests

For the iCal adapter, integration tests should cover:

```javascript
// Test calendar parsing with recurring events
it('should parse recurring events correctly', function () {
    return new Promise(async (resolve, reject) => {
        try {
            harness = getHarness();
            
            const obj = await new Promise((res, rej) => {
                harness.objects.getObject('system.adapter.ical.0', (err, o) => {
                    if (err) return rej(err);
                    res(o);
                });
            });
            
            // Configure with test calendar containing recurring events
            Object.assign(obj.native, {
                daysPreview: 30,
                daysPast: 7,
                calendars: [{
                    name: 'test-calendar',
                    url: path.join(__dirname, 'data', 'recurring.ics'),
                    color: '#FF0000'
                }]
            });

            harness.objects.setObject(obj._id, obj);
            await harness.startAdapterAndWait();
            
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // Check for calendar data states
            const stateIds = await harness.dbConnection.getStateIDs('ical.0.data.*');
            
            // Verify table data contains recurring events
            const tableState = await new Promise((res, rej) => {
                harness.states.getState('ical.0.data.table', (err, state) => {
                    if (err) return rej(err);
                    res(state);
                });
            });
            
            if (tableState && tableState.val) {
                const events = JSON.parse(tableState.val);
                console.log(`📊 Found ${events.length} parsed events`);
                
                // Check for recurring event instances
                const recurringEvents = events.filter(event => 
                    event._rule && event._rule.freq
                );
                
                if (recurringEvents.length > 0) {
                    console.log('✅ Successfully parsed recurring events');
                    resolve(true);
                } else {
                    reject(new Error('No recurring events found in parsed data'));
                }
            } else {
                reject(new Error('No table data found'));
            }
            
            await harness.stopAdapter();
        } catch (error) {
            reject(error);
        }
    });
}).timeout(40000);
```

#### Test Data Files
**IMPORTANT**: Create comprehensive test data files to validate functionality:

```javascript
// test/data/simple.ics - Basic calendar for testing
// test/data/recurring.ics - Calendar with recurring events
// test/data/malformed.ics - Invalid calendar for error handling tests
// test/data/timezone.ics - Calendar with timezone-specific events
```

#### Key Rules

1. ✅ Use `@iobroker/testing` framework
2. ✅ Configure via `harness.objects.setObject()`
3. ✅ Start via `harness.startAdapterAndWait()`
4. ✅ Verify states via `harness.states.getState()`
5. ✅ Allow proper timeouts for async operations
6. ❌ NEVER test API URLs directly
7. ❌ NEVER bypass the harness system

#### Workflow Dependencies

Integration tests should run ONLY after lint and adapter tests pass:

```yaml
integration-tests:
  needs: [check-and-lint, adapter-tests]
  runs-on: ubuntu-22.04
```

### API Testing with Credentials

For adapters connecting to external APIs requiring authentication:

#### Password Encryption for Integration Tests

```javascript
async function encryptPassword(harness, password) {
    const systemConfig = await harness.objects.getObjectAsync("system.config");
    if (!systemConfig?.native?.secret) {
        throw new Error("Could not retrieve system secret for password encryption");
    }
    
    const secret = systemConfig.native.secret;
    let result = '';
    for (let i = 0; i < password.length; ++i) {
        result += String.fromCharCode(secret[i % secret.length].charCodeAt(0) ^ password.charCodeAt(i));
    }
    return result;
}
```

#### Demo Credentials Testing Pattern

- Use provider demo credentials when available (e.g., `demo@api-provider.com` / `demo`)
- Create separate test file: `test/integration-demo.js`
- Add npm script: `"test:integration-demo": "mocha test/integration-demo --exit"`
- Implement clear success/failure criteria

**Example Implementation:**
```javascript
it("Should connect to API with demo credentials", async () => {
    const encryptedPassword = await encryptPassword(harness, "demo_password");
    
    await harness.changeAdapterConfig("your-adapter", {
        native: {
            username: "demo@provider.com",
            password: encryptedPassword,
        }
    });

    await harness.startAdapter();
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    const connectionState = await harness.states.getStateAsync("your-adapter.0.info.connection");
    
    if (connectionState?.val === true) {
        console.log("✅ SUCCESS: API connection established");
        return true;
    } else {
        throw new Error("API Test Failed: Expected API connection. Check logs for API errors.");
    }
}).timeout(120000);
```

---

## Development Best Practices

### Dependency Management

- Always use `npm` for dependency management
- Use `npm ci` for installing existing dependencies (respects package-lock.json)
- Use `npm install` only when adding or updating dependencies
- Keep dependencies minimal and focused
- Only update dependencies in separate Pull Requests

**When modifying package.json:**
1. Run `npm install` to sync package-lock.json
2. Commit both package.json and package-lock.json together

**Best Practices:**
- Prefer built-in Node.js modules when possible
- Use `@iobroker/adapter-core` for adapter base functionality
- Avoid deprecated packages
- Document specific version requirements

### HTTP Client Libraries

- **Preferred:** Use native `fetch` API (Node.js 20+ required)
- **Avoid:** `axios` unless specific features are required

**Example with fetch:**
```javascript
try {
  const response = await fetch('https://api.example.com/data');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
} catch (error) {
  this.log.error(`API request failed: ${error.message}`);
}
```

**Other Recommendations:**
- **Logging:** Use adapter built-in logging (`this.log.*`)
- **Scheduling:** Use adapter built-in timers and intervals
- **File operations:** Use Node.js `fs/promises`
- **Configuration:** Use adapter config system

### Error Handling

- Always catch and log errors appropriately
- Use adapter log levels (error, warn, info, debug)
- Provide meaningful, user-friendly error messages
- Handle network failures gracefully
- Implement retry mechanisms where appropriate
- Always clean up timers, intervals, and resources in `unload()` method

**Example:**
```javascript
try {
  await this.connectToDevice();
} catch (error) {
  this.log.error(`Failed to connect to device: ${error.message}`);
  this.setState('info.connection', false, true);
  // Implement retry logic if needed
}
```

---

## Admin UI Configuration

### JSON-Config Setup

Use JSON-Config format for modern ioBroker admin interfaces.

**Example Structure:**
```json
{
  "type": "panel",
  "items": {
    "host": {
      "type": "text",
      "label": "Host address",
      "help": "IP address or hostname of the device"
    }
  }
}
```

**Guidelines:**
- ✅ Use consistent naming conventions
- ✅ Provide sensible default values
- ✅ Include validation for required fields
- ✅ Add tooltips for complex options
- ✅ Ensure translations for all supported languages (minimum English and German)
- ✅ Write end-user friendly labels, avoid technical jargon

### Translation Management

**CRITICAL:** Translation files must stay synchronized with `admin/jsonConfig.json`. Orphaned keys or missing translations cause UI issues and PR review delays.

#### Overview
- **Location:** `admin/i18n/{lang}/translations.json` for 11 languages (de, en, es, fr, it, nl, pl, pt, ru, uk, zh-cn)
- **Source of truth:** `admin/jsonConfig.json` - all `label` and `help` properties must have translations
- **Command:** `npm run translate` - auto-generates translations but does NOT remove orphaned keys
- **Formatting:** English uses tabs, other languages use 4 spaces

#### Critical Rules
1. ✅ Keys must match exactly with jsonConfig.json
2. ✅ No orphaned keys in translation files
3. ✅ All translations must be in native language (no English fallbacks)
4. ✅ Keys must be sorted alphabetically

#### Workflow for Translation Updates

**When modifying admin/jsonConfig.json:**

1. Make your changes to labels/help texts
2. Run automatic translation: `npm run translate`
3. Create validation script (`scripts/validate-translations.js`):

```javascript
const fs = require('fs');
const path = require('path');
const jsonConfig = JSON.parse(fs.readFileSync('admin/jsonConfig.json', 'utf8'));

function extractTexts(obj, texts = new Set()) {
    if (typeof obj === 'object' && obj !== null) {
        if (obj.label) texts.add(obj.label);
        if (obj.help) texts.add(obj.help);
        for (const key in obj) {
            extractTexts(obj[key], texts);
        }
    }
    return texts;
}

const requiredTexts = extractTexts(jsonConfig);
const languages = ['de', 'en', 'es', 'fr', 'it', 'nl', 'pl', 'pt', 'ru', 'uk', 'zh-cn'];
let hasErrors = false;

languages.forEach(lang => {
    const translationPath = path.join('admin', 'i18n', lang, 'translations.json');
    const translations = JSON.parse(fs.readFileSync(translationPath, 'utf8'));
    const translationKeys = new Set(Object.keys(translations));
    
    const missing = Array.from(requiredTexts).filter(text => !translationKeys.has(text));
    const orphaned = Array.from(translationKeys).filter(key => !requiredTexts.has(key));
    
    console.log(`\n=== ${lang} ===`);
    if (missing.length > 0) {
        console.error('❌ Missing keys:', missing);
        hasErrors = true;
    }
    if (orphaned.length > 0) {
        console.error('❌ Orphaned keys (REMOVE THESE):', orphaned);
        hasErrors = true;
    }
    if (missing.length === 0 && orphaned.length === 0) {
        console.log('✅ All keys match!');
    }
});

process.exit(hasErrors ? 1 : 0);
```

4. Run validation: `node scripts/validate-translations.js`
5. Remove orphaned keys manually from all translation files
6. Add missing translations in native languages
7. Run: `npm run lint && npm run test`

#### Add Validation to package.json

```json
{
  "scripts": {
    "translate": "translate-adapter",
    "validate:translations": "node scripts/validate-translations.js",
    "pretest": "npm run lint && npm run validate:translations"
  }
}
```

#### Translation Checklist

Before committing changes to admin UI or translations:
1. ✅ Validation script shows "All keys match!" for all 11 languages
2. ✅ No orphaned keys in any translation file
3. ✅ All translations in native language
4. ✅ Keys alphabetically sorted
5. ✅ `npm run lint` passes
6. ✅ `npm run test` passes
7. ✅ Admin UI displays correctly

---

## Documentation

### README Updates

#### Required Sections
1. **Installation** - Clear npm/ioBroker admin installation steps
2. **Configuration** - Detailed configuration options with examples
3. **Usage** - Practical examples and use cases
4. **Changelog** - Version history (use "## **WORK IN PROGRESS**" for ongoing changes)
5. **License** - License information (typically MIT for ioBroker adapters)
6. **Support** - Links to issues, discussions, community support

#### Documentation Standards
- Use clear, concise language
- Include code examples for configuration
- Add screenshots for admin interface when applicable
- Maintain multilingual support (minimum English and German)
- Always reference issues in commits and PRs (e.g., "fixes #xx")

#### Mandatory README Updates for PRs

For **every PR or new feature**, always add a user-friendly entry to README.md:

- Add entries under `## **WORK IN PROGRESS**` section
- Use format: `* (author) **TYPE**: Description of user-visible change`
- Types: **NEW** (features), **FIXED** (bugs), **ENHANCED** (improvements), **TESTING** (test additions), **CI/CD** (automation)
- Focus on user impact, not technical details

**Example:**
```markdown
## **WORK IN PROGRESS**

* (DutchmanNL) **FIXED**: Adapter now properly validates login credentials (fixes #25)
* (DutchmanNL) **NEW**: Added device discovery to simplify initial setup
```

### Changelog Management

Follow the [AlCalzone release-script](https://github.com/AlCalzone/release-script) standard.

#### Format Requirements

```markdown
# Changelog

<!--
  Placeholder for the next version (at the beginning of the line):
  ## **WORK IN PROGRESS**
-->

## **WORK IN PROGRESS**

- (author) **NEW**: Added new feature X
- (author) **FIXED**: Fixed bug Y (fixes #25)

## v0.1.0 (2023-01-01)
Initial release
```

#### Workflow Process
- **During Development:** All changes go under `## **WORK IN PROGRESS**`
- **For Every PR:** Add user-facing changes to WORK IN PROGRESS section
- **Before Merge:** Version number and date added when merging to main
- **Release Process:** Release-script automatically converts placeholder to actual version

#### Change Entry Format
- Format: `- (author) **TYPE**: User-friendly description`
- Types: **NEW**, **FIXED**, **ENHANCED**
- Focus on user impact, not technical implementation
- Reference issues: "fixes #XX" or "solves #XX"

---

## CI/CD & GitHub Actions

### Workflow Configuration

#### GitHub Actions Best Practices

**Must use ioBroker official testing actions:**
- `ioBroker/testing-action-check@v1` for lint and package validation
- `ioBroker/testing-action-adapter@v1` for adapter tests
- `ioBroker/testing-action-deploy@v1` for automated releases with Trusted Publishing (OIDC)

**Configuration:**
- **Node.js versions:** Test on 20.x, 22.x, 24.x
- **Platform:** Use ubuntu-22.04
- **Automated releases:** Deploy to npm on version tags (requires NPM Trusted Publishing)
- **Monitoring:** Include Sentry release tracking for error monitoring

#### Critical: Lint-First Validation Workflow

**ALWAYS run ESLint checks BEFORE other tests.** Benefits:
- Catches code quality issues immediately
- Prevents wasting CI resources on tests that would fail due to linting errors
- Provides faster feedback to developers
- Enforces consistent code quality

**Workflow Dependency Configuration:**
```yaml
jobs:
  check-and-lint:
    # Runs ESLint and package validation
    # Uses: ioBroker/testing-action-check@v1
    
  adapter-tests:
    needs: [check-and-lint]  # Wait for linting to pass
    # Run adapter unit tests
    
  integration-tests:
    needs: [check-and-lint, adapter-tests]  # Wait for both
    # Run integration tests
```

**Key Points:**
- The `check-and-lint` job has NO dependencies - runs first
- ALL other test jobs MUST list `check-and-lint` in their `needs` array
- If linting fails, no other tests run, saving time
- Fix all ESLint errors before proceeding

### Testing Integration

#### API Testing in CI/CD

For adapters with external API dependencies:

```yaml
demo-api-tests:
  if: contains(github.event.head_commit.message, '[skip ci]') == false
  runs-on: ubuntu-22.04
  
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Use Node.js 20.x
      uses: actions/setup-node@v4
      with:
        node-version: 20.x
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run demo API tests
      run: npm run test:integration-demo
```

#### Testing Best Practices
- Run credential tests separately from main test suite
- Don't make credential tests required for deployment
- Provide clear failure messages for API issues
- Use appropriate timeouts for external calls (120+ seconds)

#### Package.json Integration
```json
{
  "scripts": {
    "test:integration-demo": "mocha test/integration-demo --exit"
  }
}
```

---

[CUSTOMIZE: Add any adapter-specific coding standards or patterns here]

### iCal Adapter Patterns

#### Adapter Structure
```javascript
const utils = require('@iobroker/adapter-core');

class AdapterName extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: 'adaptername',
        });
        
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }
    
    async onReady() {
        // Initialize adapter
    }
    
    onStateChange(id, state) {
        // Handle state changes
    }
    
    onUnload(callback) {
        // Clean up resources
        callback();
    }
}
```

#### iCal Adapter State Patterns

For the iCal adapter, follow these specific state management patterns:

```javascript
// Create channel structure for calendar events
await this.setObjectNotExistsAsync('events', {
    type: 'channel',
    common: {
        name: 'Calendar Events'
    }
});

// Create data states for different output formats
await this.setObjectNotExistsAsync('data.table', {
    type: 'state',
    common: {
        name: 'Calendar data as array',
        type: 'array',
        role: 'list',
        read: true,
        write: false
    }
});

await this.setObjectNotExistsAsync('data.html', {
    type: 'state',
    common: {
        name: 'Calendar data as HTML',
        type: 'string',
        role: 'html',
        read: true,
        write: false
    }
});

// Create event trigger states with proper ACK handling
const eventName = 'Vacation';
const stateName = `events.0.today.${this.shrinkStateName(eventName)}`;
await this.setStateAsync(stateName, { val: true, ack: true });

// Trigger external device states based on calendar events
if (eventConfig.id) {
    await this.setForeignStateAsync(eventConfig.id, eventConfig.on, eventConfig.ack);
}
```

#### iCal Configuration Patterns

```javascript
// Validate calendar configuration
if (!this.config.calendars || this.config.calendars.length === 0) {
    this.log.error('No calendars configured');
    return;
}

// Process each calendar
for (const cal of this.config.calendars) {
    if (!cal.url) {
        this.log.warn(`Calendar "${cal.name}" has no URL configured`);
        continue;
    }
    
    try {
        const data = await this.getICal(cal.url, cal.user, cal.pass, cal.sslignore, cal.name);
        const events = this.parseCalendarData(data, cal);
        await this.processEvents(events, cal);
    } catch (error) {
        this.log.error(`Failed to process calendar "${cal.name}": ${error.message}`);
    }
}
```

#### iCal HTTP Request Patterns

```javascript
async getICal(urlOrFile, user, pass, sslignore, calName) {
    // Handle local files vs URLs
    if (!urlOrFile.match(/^https?:\/\//)) {
        // Local file handling
        const exists = await this.fileExistsAsync(this.namespace, urlOrFile);
        if (exists) {
            const fileData = await this.readFileAsync(this.namespace, urlOrFile);
            return fileData.file.toString();
        }
        throw new Error(`File not found: ${urlOrFile}`);
    }
    
    // HTTP request with proper options
    const options = {
        method: 'get',
        url: urlOrFile,
        timeout: 30000
    };
    
    // Add authentication if provided
    if (user) {
        options.auth = {
            username: user,
            password: pass
        };
    }
    
    // Handle SSL ignore
    if (sslignore === 'ignore' || sslignore === true) {
        const https = require('https');
        options.httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });
    }
    
    // Custom user agent support
    if (this.config.customUserAgentEnabled && this.config.customUserAgent) {
        options.headers = {
            'User-Agent': this.config.customUserAgent
        };
    }
    
    const response = await axios(options);
    return response.data;
}
```

#### iCal Performance Patterns

```javascript
// Cache calendar data to avoid repeated fetches
const crypto = require('crypto');
const path = require('path');
const os = require('os');

async getICal(urlOrFile, user, pass, sslignore, calName) {
    // Create cache key from parameters
    const calHash = crypto
        .createHash('md5')
        .update(user + pass + urlOrFile)
        .digest('hex');
    
    const cachedFilename = path.join(os.tmpdir(), `iob-${calHash}.ics`);
    
    try {
        const response = await axios(options);
        // Cache successful response
        fs.writeFileSync(cachedFilename, response.data, 'utf-8');
        return response.data;
    } catch (error) {
        // Try to use cached version on error
        if (fs.existsSync(cachedFilename)) {
            this.log.warn(`Using cached calendar data due to fetch error: ${error.message}`);
            return fs.readFileSync(cachedFilename, 'utf-8');
        }
        throw error;
    }
}

// Process events efficiently with proper date handling
processEvents(events, calendar) {
    const processedEvents = [];
    const now = new Date();
    const previewUntil = new Date(now.getTime() + (this.config.daysPreview * 24 * 60 * 60 * 1000));
    
    for (const event of events) {
        // Skip events outside preview window
        if (event.start > previewUntil) continue;
        
        // Handle recurring events efficiently
        if (event.rrule) {
            const rule = new RRule(RRule.parseString(event.rrule));
            const occurrences = rule.between(now, previewUntil, true);
            
            for (const occurrence of occurrences) {
                processedEvents.push({
                    ...event,
                    start: occurrence,
                    _isRecurring: true
                });
            }
        } else {
            processedEvents.push(event);
        }
    }
    
    return processedEvents.sort((a, b) => a.start - b.start);
}
```

#### iCal Security Patterns

```javascript
// Validate calendar URLs
validateCalendarUrl(url) {
    try {
        const parsed = new URL(url);
        
        // Only allow http/https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Invalid protocol - only HTTP/HTTPS allowed');
        }
        
        // Prevent localhost/private IP access if needed
        const hostname = parsed.hostname;
        if (hostname === 'localhost' || hostname.startsWith('127.')) {
            this.log.warn('Calendar URL points to localhost');
        }
        
        return true;
    } catch (error) {
        throw new Error(`Invalid calendar URL: ${error.message}`);
    }
}

// Safely handle calendar authentication
async getICal(urlOrFile, user, pass, sslignore, calName) {
    // Mask credentials in logs
    const logUrl = user ? 
        urlOrFile.replace(/(\/\/)[^@]+@/, '$1***:***@') : 
        urlOrFile;
    
    this.log.debug(`Fetching calendar: ${logUrl}`);
    
    // Don't log auth details
    const options = {
        method: 'get',
        url: urlOrFile,
        timeout: 30000
    };
    
    if (user) {
        options.auth = {
            username: user,
            password: pass
        };
        // Never log the options object if it contains credentials
    }
    
    // Validate SSL by default unless explicitly ignored
    if (sslignore !== 'ignore' && sslignore !== true) {
        // SSL validation enabled (default)
        this.log.debug('SSL certificate validation enabled');
    } else {
        this.log.warn(`SSL certificate validation disabled for ${calName}`);
    }
    
    return axios(options);
}
```

#### iCal Documentation Patterns

```javascript
/**
 * Retrieves and parses an iCalendar file from URL or local path
 * @param {string} urlOrFile - HTTP URL or local file path to .ics file
 * @param {string} user - Username for HTTP authentication (optional)
 * @param {string} pass - Password for HTTP authentication (optional)
 * @param {string|boolean} sslignore - Whether to ignore SSL certificate errors
 * @param {string} calName - Human-readable calendar name for logging
 * @returns {Promise<string>} Raw iCalendar data as string
 * @throws {Error} When file/URL cannot be accessed or authentication fails
 * 
 * @example
 * // Fetch from URL with authentication
 * const icsData = await getICal('https://calendar.example.com/cal.ics', 'user', 'pass', false, 'Work Calendar');
 * 
 * // Read from local file
 * const localData = await getICal('/path/to/calendar.ics', null, null, false, 'Local Calendar');
 */
async getICal(urlOrFile, user, pass, sslignore, calName) {
    // Implementation...
}

/**
 * Processes recurring events using RRule library
 * @param {Object} event - Parsed iCalendar event object
 * @param {Date} startDate - Start of date range to expand
 * @param {Date} endDate - End of date range to expand
 * @returns {Array<Object>} Array of event instances within date range
 * 
 * @example
 * // Expand daily recurring event for next 30 days
 * const instances = expandRecurringEvent(event, new Date(), new Date(Date.now() + 30*24*60*60*1000));
 */
expandRecurringEvent(event, startDate, endDate) {
    // Implementation using RRule...
}
```

#### Configuration Documentation

```javascript
// Document expected configuration structure
const defaultConfig = {
    // Number of days to look ahead for events
    daysPreview: 7,
    
    // Number of days to look back for events  
    daysPast: 0,
    
    // Whether to colorize output HTML
    colorize: true,
    
    // Default text color for events
    defColor: "#FFFFFF",
    
    // Array of calendar configurations
    calendars: [{
        // Human-readable calendar name
        name: "My Calendar",
        
        // URL to .ics file or local file path
        url: "https://example.com/calendar.ics",
        
        // Optional HTTP authentication username
        user: "",
        
        // Optional HTTP authentication password  
        pass: "",
        
        // Whether to ignore SSL certificate errors
        sslignore: false,
        
        // Color for this calendar's events (hex format)
        color: "#FF0000",
        
        // Optional regex filter for event titles
        filter: "",
        
        // Whether filter is treated as regex
        filterregex: false
    }],
    
    // Array of custom event configurations
    events: [{
        // Event name to watch for
        name: "Vacation",
        
        // Whether this event trigger is enabled
        enabled: true,
        
        // ioBroker state ID to control when event is active
        id: "javascript.0.vacation",
        
        // Value to set when event starts
        on: true,
        
        // Value to set when event ends
        off: false,
        
        // Whether to acknowledge state changes
        ack: false
    }]
};
```

#### iCal Adapter Best Practices

```javascript
// Proper cleanup in unload method
onUnload(callback) {
    try {
        // Clear any running timeouts
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = null;
        }
        
        // Clear intervals
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // Clean up temporary files
        this.cleanupTempFiles();
        
        this.log.info('Adapter stopped and cleaned up');
        callback();
    } catch (error) {
        this.log.error(`Error during cleanup: ${error.message}`);
        callback();
    }
}

// Implement proper state name sanitization
shrinkStateName(name) {
    // Remove invalid characters for ioBroker state names
    let cleanName = name.replace(/[\s."`'*,\\?<>[\];:]+/g, '');
    
    // Handle empty names
    if (!cleanName || cleanName.length === 0) {
        cleanName = 'onlySpecialCharacters';
    }
    
    // Limit length to prevent issues
    if (cleanName.length > 100) {
        cleanName = cleanName.substring(0, 100);
    }
    
    return cleanName;
}

// Support multiple languages in state descriptions
createEventState(eventName, day, type) {
    const stateId = `events.${day}.${type}.${this.shrinkStateName(eventName)}`;
    
    return this.setObjectNotExistsAsync(stateId, {
        type: 'state',
        common: {
            name: {
                en: `Event: ${eventName}`,
                de: `Ereignis: ${eventName}`,
                ru: `Событие: ${eventName}`
            },
            type: 'boolean',
            role: 'indicator',
            read: true,
            write: false
        }
    });
}

// Implement graceful error handling for external dependencies
async fetchCalendarWithRetry(url, options, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            this.log.debug(`Fetching calendar (attempt ${attempt}/${maxRetries}): ${url}`);
            return await axios(options);
        } catch (error) {
            lastError = error;
            
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                this.log.warn(`Calendar fetch failed (attempt ${attempt}), retrying in ${delay}ms: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw new Error(`Calendar fetch failed after ${maxRetries} attempts: ${lastError.message}`);
}
```

#### Data Validation
```javascript
// Validate configuration on startup
validateConfig() {
    const errors = [];
    
    if (!Array.isArray(this.config.calendars)) {
        errors.push('calendars must be an array');
    }
    
    this.config.calendars.forEach((cal, index) => {
        if (!cal.name) {
            errors.push(`Calendar ${index}: name is required`);
        }
        if (!cal.url) {
            errors.push(`Calendar ${index}: url is required`);
        }
    });
    
    if (errors.length > 0) {
        throw new Error('Configuration errors: ' + errors.join(', '));
    }
}
```

Remember: Always prioritize reliability, security, and user experience when developing ioBroker adapters. The adapter should handle failures gracefully and provide clear feedback to users about what's happening.

For the iCal adapter specifically, focus on robust calendar parsing, proper timezone handling, efficient recurring event processing, and reliable HTTP request handling with appropriate caching and retry mechanisms.
