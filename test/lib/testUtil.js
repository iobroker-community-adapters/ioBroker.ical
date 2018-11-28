/* jshint -W097 */// jshint strict:false
/*jslint node: true */
var setup  = require(__dirname + '/setup');

function getCurrentTimezoneName() {
	var offsetMinues = new Date().getTimezoneOffset();
	if(offsetMinues == 0) {
		return 'UTC';
	}
	var offsetNegative = offsetMinues < 0;
	offsetMinues = Math.abs(offsetMinues);
	var offsetHours = Math.floor(offsetMinues / 60);
	offsetMinues = offsetMinues % 60;

	return 'UTC' + (offsetNegative ? '+' : '-') + offsetHours + ':' + ("0" + offsetMinues).slice(-2);
}

var lacyStates;
function checkConnectionOfAdapter(lacyStates, cb, counter) {
    counter = counter || 0;
    console.log('wait for started #' + counter);
    if (counter > 30) {
        if (cb) cb('Cannot check connection');
        return;
    }

    lacyStates.states.getState('system.adapter.' + setup.adapterName.substring(setup.adapterName.indexOf('.') + 1) + '.0.alive', function (err, state) {
        if (err) console.error(err);
        if (state && state.val) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkConnectionOfAdapter(lacyStates, cb, counter + 1);
            }, 1000);
        }
    });
}

function checkAdapterFinished(lacyStates, cb, counter) {
    counter = counter || 0;
    console.log('wait until stopped #' + counter);
    if (counter > 30) {
        if (cb) cb('Connection still available');
        return;
    }

    lacyStates.states.getState('system.adapter.' + setup.adapterName.substring(setup.adapterName.indexOf('.') + 1) + '.0.alive', function (err, state) {
        if (err) console.error(err);
        if (state && !state.val) {
            if (cb) cb();
        } else {
            setTimeout(function () {
            	checkAdapterFinished(lacyStates, cb, counter + 1);
            }, 1000);
        }
    });
}
function checkAdapterStartedAndFinished(lacyStates, cb) {
	checkConnectionOfAdapter(lacyStates, function() {
		checkAdapterFinished(lacyStates, cb);
	});
}

function instr(str, search) {
	return (str.match('/' + search + ' /g') || []).length;
}

if (typeof module !== undefined && module.parent) {
    module.exports.getCurrentTimezoneName = getCurrentTimezoneName;
    module.exports.checkAdapterStartedAndFinished = checkAdapterStartedAndFinished;
    module.exports.instr = instr;
}
