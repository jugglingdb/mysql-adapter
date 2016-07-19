'use strict';

module.exports = require('should');

const Schema = require('jugglingdb').Schema;

function getConfig(options) {

    const dbConf = {
        database: 'myapp_test',
        username: 'root'
    };

    if (options) {
        Object.assign(dbConf, options);
    }

    return dbConf;
}

global.getSchema = function(options) {
    return new Schema(require('../'), getConfig(options));
};

