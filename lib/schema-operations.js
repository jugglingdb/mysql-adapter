'use strict';

module.exports = function(informationSchema, db, settings) {

    const {
        tableName,
        tableNameUnescaped,
        getModelNames,
        getModel,
        getSetting,
        propertiesSQL,
        dataType,
        propertySettingsSQL
    } = informationSchema;

    const {
        command,
        query,
    } = db;

    return {
        autoupdate,
        automigrate,
        alterTable,
        buildAlterTableSQL,
        dropTable,
        createTable,
        recreateDatabase,
        isActual
    };

    function getTableInfo(model) {
        const table = tableNameUnescaped(model);
        return Promise.all([
            query('SHOW FIELDS FROM ??', [ table ]),
            query('SHOW INDEXES FROM ??', [ table ])
        ])
            .catch(err => {
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    return [[], [], true];
                }
                throw err;
            })
            .then(results => {
                const [ fields, indexes, tableMissing ] = results;
                return {
                    fields,
                    indexes,
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
                if (info.tableMissing) {
                    return false;
                }

                const sql = buildAlterTableSQL(model, info.fields, info.indexes);
                const isActual = sql.length === 0;
                return isActual;
            });
    }

    function buildAlterTableSQL(model, actualFields, actualIndexes) {
        const m = getModel(model);
        const propNames = Object.keys(m.properties).filter(name => {
            return !!m.properties[name];
        });

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
        const foundId = actualFields && actualFields.find(f => f.Field === 'id');

        if (foundId) {
            const uuidVersion = getSetting(model, 'uuid');
            if (uuidVersion === 'v4' || uuidVersion === 'v1') {
                if (foundId.Type.toUpperCase() !== 'CHAR(36)') {
                    sql.push('CHANGE COLUMN `id` `id` CHAR(36) NOT NULL');
                }
            } else if (foundId.Type.toUpperCase() !== 'INT(11)') {
                sql.push('CHANGE COLUMN `id` `id` INT(11) NOT NULL AUTO_INCREMENT');
            }
        }

        // change/add new fields
        propNames
            .filter(function(propName) { return propName !== 'id'; })
            .forEach(function(propName) {
                let found;
                if (actualFields) {
                    actualFields.forEach(function(f) {
                        if (f.Field === propName) {
                            found = f;
                        }
                    });
                }

                if (found) {
                    actualize(propName, found);
                } else {
                    sql.push('ADD COLUMN `' + propName + '` ' + propertySettingsSQL(model, propName));
                }
            });

        // drop columns
        if (actualFields) {
            actualFields.forEach(function(f) {
                const notFound = !~propNames.indexOf(f.Field);
                if (f.Field === 'id') return;
                if (notFound || !m.properties[f.Field]) {
                    sql.push('DROP COLUMN `' + f.Field + '`');
                }
            });
        }

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
        propNames.forEach(function(propName) {
            const prop = m.properties[propName];
            const i = prop.index;
            if (!i || prop.type && (prop.type instanceof Array ||  prop.type.name === 'JSON')) {
                return;
            }
            const found = ai[propName] && ai[propName].info;
            if (!found) {
                let type = '';
                const kind = '';
                if (i.type) {
                    type = 'USING ' + i.type;
                }
                if (i.kind) {
                    // kind = i.kind;
                }
                if (kind && type) {
                    sql.push('ADD ' + kind + ' INDEX `' + propName + '` (`' + propName + '`) ' + type);
                } else {
                    sql.push('ADD ' + kind + ' INDEX `' + propName + '` ' + type + ' (`' + propName + '`) ');
                }
            }
        });

        // add multi-column indexes
        indexNames.forEach(function(indexName) {
            const i = m.settings.indexes[indexName];
            const found = ai[indexName] && ai[indexName].info;
            if (!found) {
                let type = '';
                let kind = '';
                if (i.type) {
                    type = 'USING ' + i.type;
                }
                if (i.kind) {
                    kind = i.kind;
                }
                if (i.keys && i.keys.length) {
                    i.columns = '`' + i.keys.join('`, `') + '`';
                }
                if (kind && type) {
                    sql.push('ADD ' + kind + ' INDEX `' + indexName + '` (' + i.columns + ') ' + type);
                } else {
                    sql.push('ADD ' + kind + ' INDEX ' + type + ' `' + indexName + '` (' + i.columns + ')');
                }
            }
        });

        return sql;

        function actualize(propName, oldSettings) {
            const newSettings = m.properties[propName];
            if (newSettings && changed(newSettings, oldSettings)) {
                sql.push('CHANGE COLUMN `' + propName + '` `' + propName + '` ' + propertySettingsSQL(model, propName));
            }
        }

        function changed(newSettings, oldSettings) {
            if (oldSettings.Null === 'YES') { // Used to allow null and does not now.
                if (newSettings.allowNull === false) return true;
                if (newSettings.null === false) return true;
            }
            if (oldSettings.Null === 'NO') { // Did not allow null and now does.
                if (newSettings.allowNull === true) return true;
                if (newSettings.null === true) return true;
                if (newSettings.null === undefined && newSettings.allowNull === undefined) return true;
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

