'use strict';

module.exports = function(informationSchema, db, settings) {

    const {
        tableName,
        tableNameUnescaped,
        getModelNames,
        getModel,
        getSetting,
        propertiesSQL,
        formatIndexDefinition,
        dataType,
        propertySettingsSQL,
        escapeKey
    } = informationSchema;

    const {
        command,
        query,
    } = db;

    return {
        autoupdate,
        automigrate,
        alterTable,
        getTableInfo,
        buildAlterTableSQL,
        getAlterTableSQL,
        dropTable,
        createTable,
        recreateDatabase,
        isActual
    };

    function getTableInfo(model) {
        const table = tableNameUnescaped(model);
        return Promise.all([
            query('SHOW FIELDS FROM ??', [ table ]),
            query('SHOW INDEXES FROM ??', [ table ]),
            query('SHOW CREATE TABLE ??', [ table ])
        ])
            .catch(err => {
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    return [[], [], [], true];
                }
                throw err;
            })
            .then(results => {
                const [ fields, indexes, sql, tableMissing ] = results;
                return {
                    fields,
                    indexes,
                    sql: sql[0] && sql[0]['Create Table'],
                    tableMissing
                };
            });
    }

    function autoupdate() {
        return Promise.all(getModelNames()
            .map(model => getTableInfo(model)
                .then(info => info.tableMissing
                    ? createTable(model)
                    : alterTable(model, info.fields, info.indexes)
                )
            )
        );
    }

    function automigrate() {
        return recreateDatabase()
            .then(() => Promise.all(
                getModelNames()
                .map(model =>
                    dropTable(model)
                    .then(() => createTable(model))
                )
            ));
    }

    function dropTable(model) {
        const table = tableName(model);
        return command(`DROP TABLE IF EXISTS ${ table }`);
    }

    function createTable(model) {
        const table = tableName(model);
        const props = propertiesSQL(model);
        return command(`CREATE TABLE ${ table }
            ( ${ props } )`);
    }

    function recreateDatabase() {
        const {
            database,
            charset,
            collation
        } = settings;

        return command('DROP DATABASE IF EXISTS ??', [ database ])
            .then(() => {
                const sql = 'CREATE DATABASE ?? CHARACTER SET ? COLLATE ?';
                return command(sql, [ database, charset, collation ]);
            })
            .then(() => command('USE ??', [ database ]));
    }

    function alterTable(model, actualFields, actualIndexes) {
        const sql = buildAlterTableSQL(model, actualFields, actualIndexes);

        if (sql.length) {
            return query(`ALTER TABLE ${ tableName(model) } ${ sql.join(',\n') }`);
        }

        return Promise.resolve();
    }

    function isActualModel(model) {
        return getTableInfo(model)
            .then(info => {
                // console.log('info for', model, info);
                if (info.tableMissing) {
                    return false;
                }

                const sql = buildAlterTableSQL(model, info.fields, info.indexes);
                const isActual = sql.length === 0;
                return isActual;
            });
    }

    function getAlterTableSQL(model) {
        return getTableInfo('Model')
            .then(info => buildAlterTableSQL(model, info.fields, info.indexes));
    }

    function buildAlterTableSQL(model, actualFields, actualIndexes) {
        const m = getModel(model);
        const propNames = Object.keys(m.properties).filter(name => Boolean(m.properties[name]));
        const nonIdPropNames = propNames.filter(propName => propName !== 'id');
        const nonIdActualProps = actualFields.filter(f => f.Field !== 'id');
        const idProperty = actualFields.find(f => f.Field === 'id');

        const indexNames = m.settings.indexes ? Object.keys(m.settings.indexes).filter(name => {
            return !!m.settings.indexes[name];
        }): [];
        const sql = [];
        const ai = {};

        actualIndexes.forEach(i => {
            const name = i.Key_name;
            if (!ai[name]) {
                ai[name] = {
                    info : i,
                    columns : []
                };
            }
            ai[name].columns[i.Seq_in_index - 1] = i.Column_name;
        });
        const aiNames = Object.keys(ai);

        // update primary key (id)
        const uuidVersion = getSetting(model, 'uuid');
        if (uuidVersion === 'v4' || uuidVersion === 'v1') {
            if (idProperty.Type.toUpperCase() !== 'CHAR(36)') {
                addOperations([
                    'CHANGE COLUMN `id` `id` CHAR(36) NOT NULL'
                ]);
            }
        } else if (idProperty.Type.toUpperCase() !== 'INT(11)') {
            addOperations([
                'CHANGE COLUMN `id` `id` INT(11) NOT NULL AUTO_INCREMENT'
            ]);
        }

        // add new fields
        addOperations(nonIdPropNames
            .filter(propName => !actualFields.find(f => f.Field === propName))
            .map(propName =>
                `ADD COLUMN ${ escapeKey(propName) } ${ propertySettingsSQL(
                    model, propName
                ) }`
            ));

        // change actual fields
        addOperations(nonIdActualProps
            .filter(f => propNames.includes(f.Field) &&
                changed(m.properties[f.Field], f))
            .map(f =>
                `CHANGE COLUMN ${ escapeKey(f.Field) } ${ escapeKey(f.Field) } ${
                    propertySettingsSQL(model, f.Field)
                }`
            ));

        // drop columns
        addOperations(nonIdActualProps
            .filter(f => !propNames.includes(f.Field))
            .map(f => `DROP COLUMN ${ escapeKey(f.Field) }`));

        // remove indexes
        aiNames.forEach(function(indexName) {
            if (indexName === 'id' || indexName === 'PRIMARY') return;
            if (indexNames.indexOf(indexName) === -1 && !m.properties[indexName] || m.properties[indexName] && (!m.properties[indexName].index || m.properties[indexName].type instanceof Array || m.properties[indexName].type.name === 'JSON')) {
                sql.push('DROP INDEX `' + indexName + '`');
            } else {
                // first: check single (only type and kind)
                if (m.properties[indexName] && !m.properties[indexName].index) {
                    // TODO
                    return;
                }
                // second: check multiple indexes
                let orderMatched = true;
                if (indexNames.indexOf(indexName) !== -1) {
                    if (m.settings.indexes[indexName].keys) {
                        m.settings.indexes[indexName].columns = m.settings.indexes[indexName].keys.join(',');
                    }
                    m.settings.indexes[indexName].columns.split(/,\s*/).forEach(function(columnName, i) {
                        if (ai[indexName].columns[i] !== columnName) orderMatched = false;
                    });
                }
                if (!orderMatched) {
                    sql.push('DROP INDEX `' + indexName + '`');
                    delete ai[indexName];
                }
            }
        });

        // add single-column indexes
        addOperations(propNames
            .filter(propName => m.properties[propName].index &&
                !(ai[propName] && ai[propName].info))
            .map(propName => {
                const prop = m.properties[propName];
                const i = prop.index;

                return 'ADD ' + formatIndexDefinition(
                    propName,
                    i.kind,
                    i.type,
                    [ propName ]
                );
            }));

        // add multi-column indexes
        addOperations(indexNames
            .filter(indexName => !(ai[indexName] && ai[indexName].info))
            .map(indexName => {
                const i = m.settings.indexes[indexName];

                return 'ADD ' + formatIndexDefinition(
                    indexName,
                    i.kind,
                    i.type,
                    i.keys 
                );
            }));

        return sql;

        function addOperations(array) {
            [].splice.apply(sql, [ sql.length, 0 ].concat(array));
        }

        function changed(newSettings, oldSettings) {
            if (oldSettings.Null === 'YES') { // Used to allow null and does not now.
                if (newSettings.allowNull === false) return true;
                if (newSettings.null === false) return true;
            }
            if (oldSettings.Null === 'NO') { // Did not allow null and now does.
                if (newSettings.allowNull === true) return true;
                if (newSettings.null === true) return true;
                if (typeof newSettings.null === 'undefined' && typeof newSettings.allowNull === 'undefined') return true;
            }

            if (oldSettings.Type.toUpperCase() !== dataType(newSettings).toUpperCase()) return true;
            return false;
        }
    }

    function isActual() {
        return Promise.all(
            getModelNames().map(isActualModel)
        )
            .then(results => !results.some(result => !result));

    }

};

