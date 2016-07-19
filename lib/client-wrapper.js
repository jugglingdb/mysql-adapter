'use strict';

const debug = require('debug')('mysql:query');
const mysql = require('mysql');

module.exports = function(client) {

    return {
        command,
        query,
        escapeId: mysql.escapeId
    };

    function command() {
        return _query('run', arguments);
    }

    function query() {
        return _query('all', arguments);
    }

    function _query(method, args) {
        debug(args[0]);

        return new Promise((resolve, reject) => {
            client.query.apply(client, [].slice.call(args).concat((err, result) => {
                if (err) {
                    return reject(err);
                }

                if (method !== 'run') {
                    return resolve(result);
                } 

                const lastID = result.insertId;
                const changes = result.affectedRows;

                resolve({
                    result,
                    meta: {
                        lastID,
                        changes
                    }
                });
            }));
        });
    }

};
