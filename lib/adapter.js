'use strict';

const createInformationSchema = require('./information-schema');
const clientWrapper = require('./client-wrapper');

const update = require('./update');
const insert = require('./insert');
const remove = require('./delete');
const lookup = require('./lookup-by-id');
const search = require('./lookup-by-query');
const schema = require('./schema-operations');

module.exports = function createMySQLAdapter(client, settings) {
    const db = clientWrapper(client);
    const informationSchema = createInformationSchema();

    const adapter = Object.assign({
        name: 'mysql',
        disconnect: cb => client.end(cb),
        closeConnection: () => {
            return new Promise(resolve => {
                client.end(function() {
                    resolve();
                });
            });
        },
        define: spec => informationSchema.registerModel(spec.model.modelName, spec),
        command: db.command,
        query: db.query
    },
        update(informationSchema, db),
        insert(informationSchema, db),
        remove(informationSchema, db),
        lookup(informationSchema, db),
        search(informationSchema, db),
        schema(informationSchema, db, settings)
    );

    return adapter;
};

