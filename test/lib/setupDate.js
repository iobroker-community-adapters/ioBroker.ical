'use strict';

const { DateTime } = require('luxon');

module.exports.newDate = function() {
    return DateTime.now(); //.setZone('America/New_York');
};