'use strict';

const assert = require('assert');

module.exports = function(informationSchema, db) {

    const {
        tableName,
        castObjectFromDb
    } = informationSchema;

    return {
        find,
        exists
    };

    function exists(model, id) {
        assert(id, 'Required "id" argument is missing');

        const table = tableName(model);
        const sql = `SELECT 1 as found FROM ${table} WHERE id = ? LIMIT 1`;

        return db.query(sql, [ id ])
            .then(r => Boolean(r[0] && r[0].found === 1));
    }

    function find(model, id) {
        assert(id, 'Required "id" argument is missing');

        const table = tableName(model);
        const sql = `SELECT * FROM ${table} WHERE id = ? LIMIT 1`;

        return db.query(sql, [ id ])
            .then(data => {
                if (data[0]) {
                    data[0].id = id;
                }
                return castObjectFromDb(model, data[0]);
            });
    }

};

