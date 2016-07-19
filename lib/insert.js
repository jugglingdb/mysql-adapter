'use strict';

const uuid = require('uuid');

module.exports = function(informationSchema, db) {

    const {
        tableName,
        castObjectForDb,
        escapeKey,
        getSetting,
    } = informationSchema;

    const command = db.command;

    return {
        create,
        updateOrCreate
    };

    function buildInsertSpec(model, data) {
        const keys = Object.keys(data);
        const table = tableName(model);
        const preparedData = castObjectForDb(model, data);
        const queryParams = keys.map(key => preparedData[key]);
        const fields = keys.map(key => escapeKey(key));
        const marks = keys.map(() => '?').join(', ');

        return {
            table,
            preparedData,
            queryParams,
            fields,
            marks
        };
    }

    function updateOrCreate(model, data) {
        const {
            table,
            fields,
            marks,
            preparedData,
            queryParams
        } = buildInsertSpec(model, data);

        const sql = `INSERT INTO ${ table } ( ${ fields } )
            VALUES ( ${ marks } )
            ON DUPLICATE KEY UPDATE ?`;

        return command(sql, queryParams.concat(preparedData))
            .then(r => r.meta.lastID);
    }

    function create(model, data) {
        const uuidType = getSetting(model, 'uuid');

        if (!data.id && (uuidType === 'v1' || uuidType === 'v4')) {
            data.id = uuid[uuidType]();
        }

        const {
            table,
            fields,
            marks,
            queryParams
        } = buildInsertSpec(model, data);

        const sql = `INSERT INTO ${ table } (${ fields }) VALUES (${ marks })`;

        return command(sql, queryParams)
            .then(r => r.meta.lastID || data.id);
    }

};

