'use strict';

const mysql = require('mysql');

module.exports = getConnection;

/**
 * Returns a connection or a connection pool based on the settings object
 *
 * @param settings {Object}     adapter settings
 * @return connection {Object}  mysql connection object or connection pool
 */
function getConnection(settings) {

    if (settings.collation) {
        // Charset should be first 'chunk' of collation.
        settings.charset = settings.collation.substr(0,
            settings.collation.indexOf('_'));
    } else {
        settings.collation = 'utf8mb4_general_ci';
        settings.charset = 'utf8mb4';
    }

    settings.supportBigNumbers = settings.supportBigNumbers || false;
    settings.timezone = settings.timezone || 'local';

    // @see https://github.com/mysqljs/mysql#connection-options
    const connectionSettings = {
        host: settings.host,
        port: settings.port,
        user: settings.username,
        database: settings.database,
        password: settings.password,
        timezone: settings.timezone,
        debug: settings.debug,
        socketPath: settings.socketPath,
        charset: settings.collation.toUpperCase(),
        supportBigNumbers: settings.supportBigNumbers,
        insecureAuth: settings.insecureAuth || false
    };

    // @see https://github.com/mysqljs/mysql#pool-options
    if (settings.pool) {
        connectionSettings.connectionLimit = settings.connectionLimit || 10;
        connectionSettings.queueLimit = settings.queueLimit || 0;
        connectionSettings.waitForConnections = settings.waitForConnections || true;
        return mysql.createPool(connectionSettings);
    }

    return mysql.createConnection(connectionSettings);
}
