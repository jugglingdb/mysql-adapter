'use strict';

const queryBuilder = require('./query-builder');
const assert = require('assert');

module.exports = function(informationSchema, db) {

    const {
        tableName,
        castForDb,
        escapeKey,
        castObjectForDb
    } = informationSchema;

    const {
        buildWhere
    } = queryBuilder(informationSchema);

    const command = db.command;

    return {
        save,
        update,
        updateAll,
        updateAttributes
    };

    function save(model, data) {
        const {
            table,
            assignments,
            queryParams
        } = buildUpdateSpec(model, data);

        const sql = `UPDATE ${ table } SET ${ assignments } WHERE id = ?`;

        return command(sql, queryParams).then(r => r.result);
    }

    function updateAttributes(model, id, data) {
        return save(model, Object.assign({}, data, { id }));
    }

    function updateAll(model, updates) {
        return Promise.all(updates.map(spec => update(model, spec)));
    }

    function update(model, spec) {

        const {
            where,
            update
        } = spec;

        assert(update, 'Required update');
        assert(where, 'Required where');

        const params = [ castObjectForDb(model, update) ];

        const conditions = buildWhere(model,  where, params, true);

        return command(
            `UPDATE ${ tableName(model) } SET ? ${ conditions }`,
            params);

    }

    function buildUpdateSpec(model, data) {
        const table = tableName(model);
        const keys = Object.keys(data);

        const queryParams = keys.map(key => castForDb(
            model,
            key,
            data[key]
        ))
            .concat(data.id);

        const assignments = keys.map(key => `${ escapeKey(key) } = ?`).join(', ');

        return {
            table,
            assignments,
            queryParams
        };
    }

};

