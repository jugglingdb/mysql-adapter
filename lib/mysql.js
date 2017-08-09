/**
 * Module dependencies
 */
const connection = require('./connection');
const adapter = require('./adapter');
const EnumFactory = require('./enum-factory').EnumFactory;

exports.initialize = function initializeSchema(schema, callback) {
    schema.client = connection(schema.settings);

    // MySQL specific column types
    schema.constructor.registerType(function Point() {});
    // Factory for Enums. Note that currently Enums can not be registered
    schema.EnumFactory = EnumFactory;

    schema.adapter = adapter(schema.client, schema.settings);
    schema.adapter.schema = schema;
    schema.adapter.connect = function(cb) {
        initializeSchema(schema, cb);
    };

    initializeConnection(schema.client, schema, callback);
};

function initializeConnection(connection, schema, callback) {
    // Attach listeners first
    connection.on('error', err => {
        schema.log('connection error', err);
        schema.connected = false;
    });

    if (schema.settings.pool) {
        callback();
    } else {
        connection.connect(err => {
            if (err) {
                console.log('connection.connect err', err);
                console.log('will reconnect in 60 secs');
                setTimeout(schema.adapter.connect.bind(schema.adapter, callback), 60000);
                return;
            }
            callback();
        });
    }
}
