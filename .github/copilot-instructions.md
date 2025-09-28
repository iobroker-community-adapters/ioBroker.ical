# ioBroker Adapter Development with GitHub Copilot

**Version:** 0.4.0
**Template Source:** https://github.com/DrozmotiX/ioBroker-Copilot-Instructions

This file contains instructions and best practices for GitHub Copilot when working on ioBroker adapter development.

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

## Testing

### Unit Testing
- Use Jest as the primary testing framework for ioBroker adapters
- Create tests for all adapter main functions and helper methods
- Test error handling scenarios and edge cases
- Mock external API calls and hardware dependencies
- For adapters connecting to APIs/devices not reachable by internet, provide example data files to allow testing of functionality without live connections
- Example test structure:
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

**IMPORTANT**: Use the official `@iobroker/testing` framework for all integration tests. This is the ONLY correct way to test ioBroker adapters.

**Official Documentation**: https://github.com/ioBroker/testing

#### Framework Structure
Integration tests MUST follow this exact pattern:

```javascript
const path = require('path');
const { tests } = require('@iobroker/testing');

// Define test coordinates or configuration
const TEST_COORDINATES = '52.520008,13.404954'; // Berlin
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Use tests.integration() with defineAdditionalTests
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
                        harness = getHarness();
                        
                        console.log('🔍 Step 1: Fetching adapter object...');
                        
                        // Get adapter object using promisified pattern
                        const obj = await new Promise((res, rej) => {
                            harness.objects.getObject('system.adapter.your-adapter.0', (err, o) => {
                                if (err) return rej(err);
                                res(o);
                            });
                        });
                        
                        if (!obj) {
                            return reject(new Error('Adapter object not found'));
                        }

                        // Configure adapter properties
                        Object.assign(obj.native, {
                            position: TEST_COORDINATES,
                            createCurrently: true,
                            createHourly: true,
                            createDaily: true,
                            // Add other configuration as needed
                        });

                        // Set the updated configuration
                        harness.objects.setObject(obj._id, obj);

                        console.log('✅ Step 1: Configuration written, starting adapter...');
                        
                        // Start adapter and wait
                        await harness.startAdapterAndWait();
                        
                        console.log('✅ Step 2: Adapter started');

                        // Wait for adapter to process data
                        const waitMs = 15000;
                        await wait(waitMs);

                        console.log('🔍 Step 3: Checking states after adapter run...');
                        
                        // Get all states created by adapter
                        const stateIds = await harness.dbConnection.getStateIDs('your-adapter.0.*');
                        
                        console.log(`📊 Found ${stateIds.length} states`);

                        if (stateIds.length > 0) {
                            console.log('✅ Adapter successfully created states');
                            
                            // Show sample of created states
                            const allStates = await new Promise((res, rej) => {
                                harness.states.getStates(stateIds, (err, states) => {
                                    if (err) return rej(err);
                                    res(states || []);
                                });
                            });
                            
                            console.log('📋 Sample states created:');
                            stateIds.slice(0, 5).forEach((stateId, index) => {
                                const state = allStates[index];
                                console.log(`   ${stateId}: ${state && state.val !== undefined ? state.val : 'undefined'}`);
                            });
                            
                            await harness.stopAdapter();
                            resolve(true);
                        } else {
                            console.log('❌ No states were created by the adapter');
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

#### Testing Both Success AND Failure Scenarios

**IMPORTANT**: For every "it works" test, implement corresponding "it doesn't work and fails" tests. This ensures proper error handling and validates that your adapter fails gracefully when expected.

```javascript
// Example: Testing successful configuration
it('should configure and start adapter with valid configuration', function () {
    return new Promise(async (resolve, reject) => {
        // ... successful configuration test as shown above
    });
}).timeout(40000);

// Example: Testing failure scenarios
it('should NOT create daily states when daily is disabled', function () {
    return new Promise(async (resolve, reject) => {
        try {
            harness = getHarness();
            
            console.log('🔍 Step 1: Fetching adapter object...');
            const obj = await new Promise((res, rej) => {
                harness.objects.getObject('system.adapter.your-adapter.0', (err, o) => {
                    if (err) return rej(err);
                    res(o);
                });
            });
            
            if (!obj) {
                return reject(new Error('Adapter object not found'));
            }

            // Configure adapter with daily DISABLED
            Object.assign(obj.native, {
                position: TEST_COORDINATES,
                createCurrently: true,
                createHourly: true,
                createDaily: false,  // <-- Disabled
            });

            harness.objects.setObject(obj._id, obj);
            await harness.startAdapterAndWait();
            
            const waitMs = 15000;
            await wait(waitMs);
            
            // Get all states
            const stateIds = await harness.dbConnection.getStateIDs('your-adapter.0.*');
            
            // Filter for daily states (should be empty)
            const dailyStates = stateIds.filter(id => id.includes('.daily'));
            
            if (dailyStates.length === 0) {
                console.log('✅ Correctly did NOT create daily states when disabled');
                await harness.stopAdapter();
                resolve(true);
            } else {
                console.log(`❌ Incorrectly created ${dailyStates.length} daily states when disabled`);
                reject(new Error(`Created daily states when disabled: ${dailyStates.join(', ')}`));
            }
            
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
            
            const waitMs = 10000;
            await wait(waitMs);
            
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

### Test Data Files
**IMPORTANT**: Create comprehensive test data files to validate functionality:

```javascript
// test/data/simple.ics - Basic calendar for testing
// test/data/recurring.ics - Calendar with recurring events
// test/data/malformed.ics - Invalid calendar for error handling tests
// test/data/timezone.ics - Calendar with timezone-specific events
```

## ioBroker Adapter Patterns

### Adapter Structure
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

### State Management
- Use `setState()` with proper ACK flags
- Create channel structure with `setObjectNotExists()`
- Use appropriate data types (string, number, boolean, array, object)
- Implement proper state roles (indicator, sensor, switch, etc.)

### iCal Adapter State Patterns

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

### Error Handling
```javascript
try {
    // Risky operation
} catch (error) {
    this.log.error(`Operation failed: ${error.message}`);
    // Handle gracefully
}
```

### Logging Levels
- `this.log.error()` - Critical errors
- `this.log.warn()` - Important warnings  
- `this.log.info()` - General information
- `this.log.debug()` - Debug information (only in debug mode)

### Configuration Access
```javascript
// Access adapter configuration
const setting = this.config.settingName;

// Validate configuration
if (!this.config.requiredSetting) {
    this.log.error('Required setting missing');
    return;
}
```

### iCal Configuration Patterns

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

### Timer and Scheduling
```javascript
// Set timeout
this.timeout = setTimeout(() => {
    // Do something
}, 5000);

// Schedule recurring task
this.interval = setInterval(() => {
    // Do something periodically
}, 60000);

// Clean up in unload
onUnload(callback) {
    if (this.timeout) clearTimeout(this.timeout);
    if (this.interval) clearInterval(this.interval);
    callback();
}
```

### File Operations
```javascript
// Read adapter file
const data = await this.readFileAsync(this.namespace, 'filename.ext');

// Write adapter file
await this.writeFileAsync(this.namespace, 'filename.ext', data);

// Check if file exists
const exists = await this.fileExistsAsync(this.namespace, 'filename.ext');
```

### HTTP Requests
```javascript
const axios = require('axios');

try {
    const response = await axios({
        method: 'get',
        url: 'https://example.com',
        timeout: 10000
    });
    
    const data = response.data;
} catch (error) {
    this.log.error(`HTTP request failed: ${error.message}`);
}
```

### iCal HTTP Request Patterns

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

## Code Quality

### ESLint Configuration
- Follow ioBroker ESLint rules
- Use `@iobroker/eslint-config`
- Fix all linting errors before commit
- Use JSDoc comments for functions

### TypeScript Support
- Add type definitions where beneficial
- Use TypeScript for complex data structures
- Maintain compatibility with JavaScript

### Performance
- Avoid blocking operations in main thread  
- Use async/await for I/O operations
- Implement proper error boundaries
- Clean up resources in unload()

### iCal Performance Patterns

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

## Security

### Input Validation
```javascript
// Validate user input
if (typeof input !== 'string' || input.length > 1000) {
    throw new Error('Invalid input');
}

// Sanitize file paths
const sanitizedPath = path.normalize(userPath).replace(/^(\.\.[\/\\])+/, '');
```

### Credential Handling
- Never log passwords or API keys
- Use encryption for stored credentials
- Validate SSL certificates by default

### iCal Security Patterns

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

## Documentation

### README Requirements
- Clear installation instructions
- Configuration examples
- Troubleshooting section
- Known limitations

### Code Comments
- Use JSDoc for functions
- Explain complex business logic
- Document API endpoints and formats
- Include examples for complex features

### iCal Documentation Patterns

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

### Configuration Documentation

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

## Best Practices

### General
- Follow semantic versioning
- Write comprehensive tests
- Use meaningful variable names
- Keep functions small and focused
- Handle edge cases gracefully

### ioBroker Specific
- Always implement `unload()` method
- Use proper state roles and types
- Implement configuration validation
- Support both German and English
- Follow ioBroker naming conventions

### iCal Adapter Best Practices

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

### Data Validation
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