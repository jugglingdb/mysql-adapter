'use strict';

const mysql = require('mysql');

module.exports = function() {

    const models = {};

    return {
        escapeKey,
        registerModel,
        getModelNames,
        getModel: name => models[name],
        getSetting,
        isDefinedProperty,
        castForDb,
        castObjectForDb,
        castFromDb,
        castObjectFromDb,
        dataType,
        propertiesSQL,
        tableName,
        tableNameUnescaped,
        propertySettingsSQL
    };

    function escapeKey(key) {
        return mysql.escapeId(key);
    }

    function tableName(model) {
        return escapeKey(tableNameUnescaped(model));
    }

    function tableNameUnescaped(model) {
        return models[model].model.tableName;
    }

    function getModelNames() {
        return Object.keys(models);
    }

    function isDefinedProperty(model, propertyName) {
        return propertyName in models[model].properties;
    }

    function getSetting(model, name) {
        return models[model].settings[name];
    }

    function registerModel(model, spec) {
        models[model] = spec;
    }

    function castObjectForDb(model, obj) {
        return Object.keys(obj)
            .reduce((result, key) => {
                result[key] = castForDb(model, key, obj[key]);
                return result;
            }, {});
    }

    function castForDb(model, key, value) {
        const prop = models[model].properties[key];
        let val = value;

        if (prop && prop.type.name === 'JSON') {
            return JSON.stringify(val);
        }

        if (val && val.constructor.name === 'Object') {
            throw new Error(`Inexpected ("object") type for ${ model }.${key}`);
        }

        if (!prop || 'undefined' === typeof val) return val;
        if (prop.type.name === 'Number') return val;
        if (val === null) return 'NULL';
        if (prop.type.name === 'Date') {
            if (!val) return 'NULL';
            if (!val.toUTCString) {
                val = new Date(val);
            }
            return val;
        }

        if (prop.type.name === 'Boolean') return val ? 1 : 0;

        return val.toString();
    }

    function castObjectFromDb(model, obj) {
        if (!obj) {
            return null;
        }

        return Object.keys(obj)
            .reduce((result, key) => {
                result[key] = castFromDb(model, key, obj[key]);
                return result;
            }, {});
    }

    function castFromDb(model, key, value) {
        const props = models[model].properties;
        let val = value;
        if (typeof val === 'undefined' || val === null) {
            return;
        }
        if (props[key]) {
            switch (props[key].type.name) {
                case 'Date':
                    // val = new Date(val.toString().replace(/GMT.*$/, 'GMT'));
                    break;
                case 'JSON':
                    val = JSON.parse(val);
                    break;
                case 'Boolean':
                    val = Boolean(val);
                    break;
            }
        }
        return val;
    }

    function dataType(property) {
        switch (property.type.name) {
            case 'String':
                return 'VARCHAR(' + (property.limit || 255) + ')';
            case 'Text':
            case 'JSON':
                return 'TEXT';
            case 'Number':
                return 'INT(11)';
            case 'Date':
                return 'DATETIME';
            case 'Boolean':
                return 'TINYINT(1)';
        }
    }

    function propertiesSQL(model) {
        let sql;
        const uuidVersion = getSetting(model, 'uuid');
        if (uuidVersion === 'v4' || uuidVersion === 'v1') {
            sql = ['`id` CHAR(36) NOT NULL PRIMARY KEY'];
        } else {
            sql = ['`id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY'];
        }
        Object.keys(models[model].properties).forEach(function(prop) {
            if (prop === 'id') return;
            sql.push('`' + prop + '` ' + propertySettingsSQL(model, prop));
        });
        // Declared in model index property indexes.
        Object.keys(models[model].properties).forEach(function (prop) {
            var p = models[model].properties[prop];
            var i = p.index;
            if (i && !(p.type instanceof Array)) {
                sql.push(singleIndexSettingsSQL(model, prop));
            }
        });
        // Settings might not have an indexes property.
        var dxs = models[model].settings.indexes;
        if (dxs) {
            Object.keys(models[model].settings.indexes).forEach(function (prop) {
                sql.push(indexSettingsSQL(model, prop));
            });
        }
        return sql.join(',\n  ');
    }

    function indexSettingsSQL(model, prop) {
        // Recycled from alterTable multi-column indexes above, more or less.
        const i = getSetting(model, 'indexes')[prop];
        const p = models[model].properties[prop];
        const type = '';
        const kind = '';

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
            return (kind + ' INDEX `' + prop + '` (' + i.columns + ') ' + type);
        }

        return (kind + ' INDEX ' + type + ' `' + prop + '` (' + i.columns + ')');
    }


    function singleIndexSettingsSQL(model, prop) {
        // Recycled from alterTable single indexes above, more or less.
        var i = models[model].properties[prop].index;
        var type = '';
        var kind = '';
        if (i.type) {
            type = 'USING ' + i.type;
        }
        if (i.kind) {
            kind = i.kind;
        }
        if (kind && type) {
            return (kind + ' INDEX `' + prop + '` (`' + prop + '`) ' + type);
        } else {
            return (kind + ' INDEX `' + prop + '` ' + type + ' (`' + prop + '`) ');
        }
    }

    function propertySettingsSQL(model, prop) {
        const p = models[model].properties[prop];
        const line = dataType(p) + ' ' +
            (p.allowNull === false || p['null'] === false ? 'NOT NULL': 'NULL');
        return line;
    }

    function dataType(p) {
        var dt = '';
        if (p.type instanceof Array) {
            return 'LONGTEXT';
        }
        switch (p.type.name) {
            default :
        case 'String':
            dt = columnType(p, 'VARCHAR');
            dt = stringOptionsByType(p, dt);
            break;
        case 'JSON':
        case 'Text':
            dt = columnType(p, 'LONGTEXT');
            dt = stringOptionsByType(p, dt);
            break;
        case 'Number':
            dt = columnType(p, 'INT');
            dt = numericOptionsByType(p, dt);
            break;
        case 'Date':
            dt = columnType(p, 'DATETIME'); // Currently doesn't need options.
            break;
        case 'Boolean':
            dt = 'TINYINT(1)';
            break;
        case 'Point':
            dt = 'POINT';
            break;
        case 'Enum':
            dt = 'ENUM(' + p.type._string + ')';
            dt = stringOptions(p, dt); // Enum columns can have charset/collation.
            break;
        }
        return dt;
    }

    function columnType(p, defaultType) {
        var dt = defaultType;
        if (p.dataType) {
            dt = String(p.dataType);
        }
        return dt;
    }

    function stringOptionsByType(p, dt) {
        switch (dt.toLowerCase()) {
            default :
        case 'varchar':
        case 'char':
            dt += '(' + (p.limit || p.length || 255) + ')';
            break;

        case 'text':
        case 'tinytext':
        case 'mediumtext':
        case 'longtext':

            break;
        }
        dt = stringOptions(p, dt);
        return dt;
    }

    function stringOptions(p, dt) {
        if (p.charset) {
            dt += " CHARACTER SET " + p.charset;
        }
        if (p.collation) {
            dt += " COLLATE " + p.collation;
        }
        return dt;
    }

    function numericOptionsByType(p, dt) {
        switch (dt.toLowerCase()) {
            default :
        case 'tinyint':
        case 'smallint':
        case 'mediumint':
        case 'int':
        case 'integer':
        case 'bigint':
            dt = integerOptions(p, dt);
            break;

        case 'decimal':
        case 'numeric':
            dt = fixedPointOptions(p, dt);
            break;

        case 'float':
        case 'double':
            dt = floatingPointOptions(p, dt);
            break;
        }
        dt = unsigned(p, dt);
        return dt;
    }

    function floatingPointOptions(p, dt) {
        var precision = 16;
        var scale = 8;
        if (p.precision) {
            precision = Number(p.precision);
        }
        if (p.scale) {
            scale = Number(p.scale);
        }
        if (p.precision && p.scale) {
            dt += '(' + precision + ',' + scale + ')';
        } else if (p.precision) {
            dt += '(' + precision + ')';
        }
        return dt;
    }

    /*  @TODO: Change fixed point to use an arbitrary precision arithmetic library.     */
    /*  Currently fixed point will lose precision because it's turned to non-fixed in   */
    /*  JS. Also, defaulting column to (9,2) and not allowing non-specified 'DECIMAL'   */
    /*  declaration which would default to DECIMAL(10,0). Instead defaulting to (9,2).  */

    function fixedPointOptions(p, dt) {
        var precision = 9;
        var scale = 2;
        if (p.precision) {
            precision = Number(p.precision);
        }
        if (p.scale) {
            scale = Number(p.scale);
        }
        dt += '(' + precision + ',' + scale + ')';
        return dt;
    }

    function integerOptions(p, dt) {
        var tmp = 0;
        if (p.display || p.limit) {
            tmp = Number(p.display || p.limit);
        }
        if (tmp > 0) {
            dt += '(' + tmp + ')';
        } else if (p.unsigned) {
            switch (dt.toLowerCase()) {
                default :
            case 'int':
                dt += '(10)';
                break;
            case 'mediumint':
                dt += '(8)';
                break;
            case 'smallint':
                dt += '(5)';
                break;
            case 'tinyint':
                dt += '(3)';
                break;
            case 'bigint':
                dt += '(20)';
                break;
            }
        } else {
            switch (dt.toLowerCase()) {
                default :
            case 'int':
                dt += '(11)';
                break;
            case 'mediumint':
                dt += '(9)';
                break;
            case 'smallint':
                dt += '(6)';
                break;
            case 'tinyint':
                dt += '(4)';
                break;
            case 'bigint':
                dt += '(20)';
                break;
            }
        }
        return dt;
    }

    function unsigned(p, dt) {
        if (p.unsigned) {
            dt += ' UNSIGNED';
        }
        return dt;
    }
};

