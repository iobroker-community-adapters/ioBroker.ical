# ioBroker Adapter Development with GitHub Copilot

**Version:** 0.4.2
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
            
            if (!obj) return reject(new Error('Adapter object not found'));
            console.log('✅ Step 1.5: Adapter object loaded');

            console.log('🔍 Step 2: Updating adapter config...');
            Object.assign(obj.native, {
                position: TEST_COORDINATES,
                createCurrently: false,
                createHourly: true,
                createDaily: false, // Daily disabled for this test
            });

            await new Promise((res, rej) => {
                harness.objects.setObject(obj._id, obj, (err) => {
                    if (err) return rej(err);
                    console.log('✅ Step 2.5: Adapter object updated');
                    res(undefined);
                });
            });

            console.log('🔍 Step 3: Starting adapter...');
            await harness.startAdapterAndWait();
            console.log('✅ Step 4: Adapter started');

            console.log('⏳ Step 5: Waiting 20 seconds for states...');
            await new Promise((res) => setTimeout(res, 20000));

            console.log('🔍 Step 6: Fetching state IDs...');
            const stateIds = await harness.dbConnection.getStateIDs('your-adapter.0.*');

            console.log(`📊 Step 7: Found ${stateIds.length} total states`);

            const hourlyStates = stateIds.filter((key) => key.includes('hourly'));
            if (hourlyStates.length > 0) {
                console.log(`✅ Step 8: Correctly ${hourlyStates.length} hourly weather states created`);
            } else {
                console.log('❌ Step 8: No hourly states created (test failed)');
                return reject(new Error('Expected hourly states but found none'));
            }

            // Check daily states should NOT be present
            const dailyStates = stateIds.filter((key) => key.includes('daily'));
            if (dailyStates.length === 0) {
                console.log(`✅ Step 9: No daily states found as expected`);
            } else {
                console.log(`❌ Step 9: Daily states present (${dailyStates.length}) (test failed)`);
                return reject(new Error('Expected no daily states but found some'));
            }

            await harness.stopAdapter();
            console.log('🛑 Step 10: Adapter stopped');

            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}).timeout(40000);

// Example: Testing missing required configuration  
it('should handle missing required configuration properly', function () {
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
            
            if (!obj) return reject(new Error('Adapter object not found'));

            console.log('🔍 Step 2: Removing required configuration...');
            // Remove required configuration to test failure handling
            delete obj.native.position; // This should cause failure or graceful handling

            await new Promise((res, rej) => {
                harness.objects.setObject(obj._id, obj, (err) => {
                    if (err) return rej(err);
                    res(undefined);
                });
            });

            console.log('🔍 Step 3: Starting adapter...');
            await harness.startAdapterAndWait();

            console.log('⏳ Step 4: Waiting for adapter to process...');
            await new Promise((res) => setTimeout(res, 10000));

            console.log('🔍 Step 5: Checking adapter behavior...');
            const stateIds = await harness.dbConnection.getStateIDs('your-adapter.0.*');

            // Check if adapter handled missing configuration gracefully
            if (stateIds.length === 0) {
                console.log('✅ Adapter properly handled missing configuration - no invalid states created');
                resolve(true);
            } else {
                // If states were created, check if they're in error state
                const connectionState = await new Promise((res, rej) => {
                    harness.states.getState('your-adapter.0.info.connection', (err, state) => {
                        if (err) return rej(err);
                        res(state);
                    });
                });
                
                if (!connectionState || connectionState.val === false) {
                    console.log('✅ Adapter properly failed with missing configuration');
                    resolve(true);
                } else {
                    console.log('❌ Adapter should have failed or handled missing config gracefully');
                    reject(new Error('Adapter should have handled missing configuration'));
                }
            }

            await harness.stopAdapter();
        } catch (error) {
            console.log('✅ Adapter correctly threw error with missing configuration:', error.message);
            resolve(true);
        }
    });
}).timeout(40000);
```

#### Advanced State Access Patterns

For testing adapters that create multiple states, use bulk state access methods to efficiently verify large numbers of states:

```javascript
it('should create and verify multiple states', () => new Promise(async (resolve, reject) => {
    // Configure and start adapter first...
    harness.objects.getObject('system.adapter.tagesschau.0', async (err, obj) => {
        if (err) {
            console.error('Error getting adapter object:', err);
            reject(err);
            return;
        }

        // Configure adapter as needed
        obj.native.someConfig = 'test-value';
        harness.objects.setObject(obj._id, obj);

        await harness.startAdapterAndWait();

        // Wait for adapter to create states
        setTimeout(() => {
            // Access bulk states using pattern matching
            harness.dbConnection.getStateIDs('tagesschau.0.*').then(stateIds => {
                if (stateIds && stateIds.length > 0) {
                    harness.states.getStates(stateIds, (err, allStates) => {
                        if (err) {
                            console.error('❌ Error getting states:', err);
                            reject(err); // Properly fail the test instead of just resolving
                            return;
                        }

                        // Verify states were created and have expected values
                        const expectedStates = ['tagesschau.0.info.connection', 'tagesschau.0.articles.0.title'];
                        let foundStates = 0;
                        
                        for (const stateId of expectedStates) {
                            if (allStates[stateId]) {
                                foundStates++;
                                console.log(`✅ Found expected state: ${stateId}`);
                            } else {
                                console.log(`❌ Missing expected state: ${stateId}`);
                            }
                        }

                        if (foundStates === expectedStates.length) {
                            console.log('✅ All expected states were created successfully');
                            resolve();
                        } else {
                            reject(new Error(`Only ${foundStates}/${expectedStates.length} expected states were found`));
                        }
                    });
                } else {
                    reject(new Error('No states found matching pattern tagesschau.0.*'));
                }
            }).catch(reject);
        }, 20000); // Allow more time for multiple state creation
    });
})).timeout(45000);
```

#### Key Integration Testing Rules

1. **NEVER test API URLs directly** - Let the adapter handle API calls
2. **ALWAYS use the harness** - `getHarness()` provides the testing environment  
3. **Configure via objects** - Use `harness.objects.setObject()` to set adapter configuration
4. **Start properly** - Use `harness.startAdapterAndWait()` to start the adapter
5. **Check states** - Use `harness.states.getState()` to verify results
6. **Use timeouts** - Allow time for async operations with appropriate timeouts
7. **Test real workflow** - Initialize → Configure → Start → Verify States

#### Workflow Dependencies
Integration tests should run ONLY after lint and adapter tests pass:

```yaml
integration-tests:
  needs: [check-and-lint, adapter-tests]
  runs-on: ubuntu-latest
  steps:
    - name: Run integration tests
      run: npx mocha test/integration-*.js --exit
```

#### What NOT to Do
❌ Direct API testing: `axios.get('https://api.example.com')`
❌ Mock adapters: `new MockAdapter()`  
❌ Direct internet calls in tests
❌ Bypassing the harness system

#### What TO Do
✅ Use `@iobroker/testing` framework
✅ Configure via `harness.objects.setObject()`
✅ Start via `harness.startAdapterAndWait()`
✅ Test complete adapter lifecycle
✅ Verify states via `harness.states.getState()`
✅ Allow proper timeouts for async operations

### API Testing with Credentials
For adapters that connect to external APIs requiring authentication, implement comprehensive credential testing:

#### Password Encryption for Integration Tests
When creating integration tests that need encrypted passwords (like those marked as `encryptedNative` in io-package.json):

1. **Read system secret**: Use `harness.objects.getObjectAsync("system.config")` to get `obj.native.secret`
2. **Apply XOR encryption**: Implement the encryption algorithm:
   ```javascript
   async function encryptPassword(harness, password) {
       const systemConfig = await harness.objects.getObjectAsync("system.config");
       if (!systemConfig || !systemConfig.native || !systemConfig.native.secret) {
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
3. **Store encrypted password**: Set the encrypted result in adapter config, not the plain text
4. **Result**: Adapter will properly decrypt and use credentials, enabling full API connectivity testing

#### Demo Credentials Testing Pattern
- Use provider demo credentials when available (e.g., `demo@api-provider.com` / `demo`)
- Create separate test file (e.g., `test/integration-demo.js`) for credential-based tests
- Add npm script: `"test:integration-demo": "mocha test/integration-demo --exit"`
- Implement clear success/failure criteria with recognizable log messages
- Expected success pattern: Look for specific adapter initialization messages
- Test should fail clearly with actionable error messages for debugging

#### Enhanced Test Failure Handling
```javascript
it("Should connect to API with demo credentials", async () => {
    // ... setup and encryption logic ...
    
    const connectionState = await harness.states.getStateAsync("adapter.0.info.connection");
    
    if (connectionState && connectionState.val === true) {
        console.log("✅ SUCCESS: API connection established");
        return true;
    } else {
        throw new Error("API Test Failed: Expected API connection to be established with demo credentials. " +
            "Check logs above for specific API errors (DNS resolution, 401 Unauthorized, network issues, etc.)");
    }
}).timeout(120000); // Extended timeout for API calls
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

## README Updates

### Required Sections
When updating README.md files, ensure these sections are present and well-documented:

1. **Installation** - Clear npm/ioBroker admin installation steps
2. **Configuration** - Detailed configuration options with examples
3. **Usage** - Practical examples and use cases
4. **Changelog** - Version history and changes (use "## **WORK IN PROGRESS**" section for ongoing changes following AlCalzone release-script standard)
5. **License** - License information (typically MIT for ioBroker adapters)
6. **Support** - Links to issues, discussions, and community support

### Documentation Standards
- Use clear, concise language
- Include code examples for configuration
- Add screenshots for admin interface when applicable
- Maintain multilingual support (at minimum English and German)
- When creating PRs, add entries to README under "## **WORK IN PROGRESS**" section following ioBroker release script standard
- Always reference related issues in commits and PR descriptions (e.g., "solves #xx" or "fixes #xx")

### Mandatory README Updates for PRs
For **every PR or new feature**, always add a user-friendly entry to README.md:

- Add entries under `## **WORK IN PROGRESS**` section before committing
- Use format: `* (author) **TYPE**: Description of user-visible change`
- Types: **NEW** (features), **FIXED** (bugs), **ENHANCED** (improvements), **TESTING** (test additions), **CI/CD** (automation)
- Focus on user impact, not technical implementation details
- Example: `* (DutchmanNL) **FIXED**: Adapter now properly validates login credentials instead of always showing "credentials missing"`

### Documentation Workflow Standards
- **Mandatory README updates**: Establish requirement to update README.md for every PR/feature
- **Standardized documentation**: Create consistent format and categories for changelog entries
- **Enhanced development workflow**: Integrate documentation requirements into standard development process

### Changelog Management with AlCalzone Release-Script
Follow the [AlCalzone release-script](https://github.com/AlCalzone/release-script) standard for changelog management:

#### Format Requirements
- Always use `## **WORK IN PROGRESS**` as the placeholder for new changes
- Add all PR/commit changes under this section until ready for release
- Never modify version numbers manually - only when merging to main branch
- Maintain this format in README.md or CHANGELOG.md:

```markdown
# Changelog

<!--
  Placeholder for the next version (at the beginning of the line):
  ## **WORK IN PROGRESS**
-->

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

## Dependency Updates

### Package Management
- Always use `npm` for dependency management in ioBroker adapters
- When working on new features in a repository with an existing package-lock.json file, use `npm ci` to install dependencies. Use `npm install` only when adding or updating dependencies.
- Keep dependencies minimal and focused
- Only update dependencies to latest stable versions when necessary or in separate Pull Requests. Avoid updating dependencies when adding features that don't require these updates.
- When you modify `package.json`:
  1. Run `npm install` to update and sync `package-lock.json`.
  2. If `package-lock.json` was updated, commit both `package.json` and `package-lock.json`.

### Dependency Best Practices
- Prefer built-in Node.js modules when possible
- Use `@iobroker/adapter-core` for adapter base functionality
- Avoid deprecated packages
- Document any specific version requirements

## JSON-Config Admin Instructions

### Configuration Schema
When creating admin configuration interfaces:

- Use JSON-Config format for modern ioBroker admin interfaces
- Provide clear labels and help text for all configuration options
- Include input validation and error messages
- Group related settings logically
- Example structure:
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

### Admin Interface Guidelines
- Use consistent naming conventions
- Provide sensible default values
- Include validation for required fields
- Add tooltips for complex configuration options
- Ensure translations are available for all supported languages (minimum English and German)
- Write end-user friendly labels and descriptions, avoiding technical jargon where possible

## Best Practices for Dependencies

### HTTP Client Libraries
- **Preferred:** Use native `fetch` API (Node.js 20+ required for adapters; built-in since Node.js 18)
- **Avoid:** `axios` unless specific features are required (reduces bundle size)

### Example with fetch:
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

### Other Dependency Recommendations
- **Logging:** Use adapter built-in logging (`this.log.*`)
- **Scheduling:** Use adapter built-in timers and intervals
- **File operations:** Use Node.js `fs/promises` for async file operations
- **Configuration:** Use adapter config system rather than external config libraries

## Error Handling

### Adapter Error Patterns
- Always catch and log errors appropriately
- Use adapter log levels (error, warn, info, debug)
- Provide meaningful, user-friendly error messages that help users understand what went wrong
- Handle network failures gracefully
- Implement retry mechanisms where appropriate
- Always clean up timers, intervals, and other resources in the `unload()` method

### Example Error Handling:
```javascript
try {
  await this.connectToDevice();
} catch (error) {
  this.log.error(`Failed to connect to device: ${error.message}`);
  this.setState('info.connection', false, true);
  // Implement retry logic if needed
}
```

### Timer and Resource Cleanup:
```javascript
// In your adapter class
private connectionTimer?: NodeJS.Timeout;

async onReady() {
  this.connectionTimer = setInterval(() => {
    this.checkConnection();
  }, 30000);
}

onUnload(callback) {
  try {
    // Clean up timers and intervals
    if (this.connectionTimer) {
      clearInterval(this.connectionTimer);
      this.connectionTimer = undefined;
    }
    // Close connections, clean up resources
    callback();
  } catch (e) {
    callback();
  }
}
```

## Code Style and Standards

- Follow JavaScript/TypeScript best practices
- Use async/await for asynchronous operations
- Implement proper resource cleanup in `unload()` method
- Use semantic versioning for adapter releases
- Include proper JSDoc comments for public methods

## CI/CD and Testing Integration

### GitHub Actions for API Testing
For adapters with external API dependencies, implement separate CI/CD jobs:

```yaml
# Tests API connectivity with demo credentials (runs separately)
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

### CI/CD Best Practices
- Run credential tests separately from main test suite
- Use ubuntu-22.04 for consistency
- Don't make credential tests required for deployment
- Provide clear failure messages for API connectivity issues
- Use appropriate timeouts for external API calls (120+ seconds)

### Package.json Script Integration
Add dedicated script for credential testing:
```json
{
  "scripts": {
    "test:integration-demo": "mocha test/integration-demo --exit"
  }
}
```

### Practical Example: Complete API Testing Implementation
Here's a complete example based on lessons learned from the Discovergy adapter:

#### test/integration-demo.js
```javascript
const path = require("path");
const { tests } = require("@iobroker/testing");

// Helper function to encrypt password using ioBroker's encryption method
async function encryptPassword(harness, password) {
    const systemConfig = await harness.objects.getObjectAsync("system.config");
    
    if (!systemConfig || !systemConfig.native || !systemConfig.native.secret) {
        throw new Error("Could not retrieve system secret for password encryption");
    }
    
    const secret = systemConfig.native.secret;
    let result = '';
    for (let i = 0; i < password.length; ++i) {
        result += String.fromCharCode(secret[i % secret.length].charCodeAt(0) ^ password.charCodeAt(i));
    }
    
    return result;
}

// Run integration tests with demo credentials
tests.integration(path.join(__dirname, ".."), {
    defineAdditionalTests({ suite }) {
        suite("API Testing with Demo Credentials", (getHarness) => {
            let harness;
            
            before(() => {
                harness = getHarness();
            });

            it("Should connect to API and initialize with demo credentials", async () => {
                console.log("Setting up demo credentials...");
                
                if (harness.isAdapterRunning()) {
                    await harness.stopAdapter();
                }
                
                const encryptedPassword = await encryptPassword(harness, "demo_password");
                
                await harness.changeAdapterConfig("your-adapter", {
                    native: {
                        username: "demo@provider.com",
                        password: encryptedPassword,
                        // other config options
                    }
                });

                console.log("Starting adapter with demo credentials...");
                await harness.startAdapter();
                
                // Wait for API calls and initialization
                await new Promise(resolve => setTimeout(resolve, 60000));
                
                const connectionState = await harness.states.getStateAsync("your-adapter.0.info.connection");
                
                if (connectionState && connectionState.val === true) {
                    console.log("✅ SUCCESS: API connection established");
                    return true;
                } else {
                    throw new Error("API Test Failed: Expected API connection to be established with demo credentials. " +
                        "Check logs above for specific API errors (DNS resolution, 401 Unauthorized, network issues, etc.)");
                }
            }).timeout(120000);
        });
    }
});
```

[CUSTOMIZE: Add any adapter-specific coding standards or patterns here]
