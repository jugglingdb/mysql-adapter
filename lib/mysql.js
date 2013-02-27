/**
 * Module dependencies
 */
var mysql = require('mysql');
var jdb = require('jugglingdb');

exports.initialize = function initializeSchema(schema, callback) {
    if (!mysql) return;

    var s = schema.settings;
    schema.client = mysql.createConnection({
        host: s.host || 'localhost',
        port: s.port || 3306,
        user: s.username,
        password: s.password,
        debug: s.debug,
        socketPath: s.socketPath
    });

    schema.client.on('error', function (err) {
        schema.emit('error', err);
    });

    schema.adapter = new MySQL(schema.client);
    schema.adapter.schema = schema;
    
    // schema.client.query('SET TIME_ZONE = "+04:00"', callback);
    schema.client.query('USE `' + s.database + '`', function (err) {
        if (err && err.message.match(/(^|: )unknown database/i)) {
            var dbName = s.database;
            schema.client.query('CREATE DATABASE ' + dbName, function (error) {
                if (!error) {
                    schema.client.query('USE ' + s.database, callback);
                } else {
                    throw error;
                }
            });
        } else callback();
    });
    
    // Set definitions later.
    schema.types = types;
};

/**
 * MySQL adapter
 */
function MySQL(client) {
    this.name = 'mysql';
    this._models = {};
    this.client = client;
}

require('util').inherits(MySQL, jdb.BaseSQL);

MySQL.prototype.query = function (sql, callback) {
    if (!this.schema.connected) {
        return this.schema.on('connected', function () {
            this.query(sql, callback);
        }.bind(this));
    }
    var client = this.client;
    var time = Date.now();
    var log = this.log;
    if (typeof callback !== 'function') throw new Error('callback should be a function');
    this.client.query(sql, function (err, data) {
        if (err && err.message.match(/(^|: )unknown database/i)) {
            var dbName = err.message.match(/(^|: )unknown database '(.*?)'/i)[1];
            client.query('CREATE DATABASE ' + dbName, function (error) {
                if (!error) {
                    client.query(sql, callback);
                } else {
                    callback(err);
                }
            });
            return;
        }
        if (log) log(sql, time);
        callback(err, data);
    });
};

/**
 * Must invoke callback(err, id)
 */
MySQL.prototype.create = function (model, data, callback) {
    var fields = this.toFields(model, data);
    var sql = 'INSERT INTO ' + this.tableEscaped(model);
    if (fields) {
        sql += ' SET ' + fields;
    } else {
        sql += ' VALUES ()';
    }
    this.query(sql, function (err, info) {
        callback(err, info && info.insertId);
    });
};

MySQL.prototype.updateOrCreate = function (model, data, callback) {
    var mysql = this;
    var fieldsNames = [];
    var fieldValues = [];
    var combined = [];
    var props = this._models[model].properties;
    Object.keys(data).forEach(function (key) {
        if (props[key] || key === 'id') {
            var k = '`' + key + '`';
            var v;
            if (key !== 'id') {
                v = mysql.toDatabase(props[key], data[key]);
            } else {
                v = data[key];
            }
            fieldsNames.push(k);
            fieldValues.push(v);
            if (key !== 'id') combined.push(k + ' = ' + v);
        }
    });

    var sql = 'INSERT INTO ' + this.tableEscaped(model);
    sql += ' (' + fieldsNames.join(', ') + ')';
    sql += ' VALUES (' + fieldValues.join(', ') + ')';
    sql += ' ON DUPLICATE KEY UPDATE ' + combined.join(', ');

    this.query(sql, function (err, info) {
        if (!err && info && info.insertId) {
            data.id = info.insertId;
        }
        callback(err, data);
    });
};

MySQL.prototype.toFields = function (model, data) {
    var fields = [];
    var props = this._models[model].properties;
    Object.keys(data).forEach(function (key) {
        if (props[key]) {
            fields.push('`' + key.replace(/\./g, '`.`') + '` = ' + this.toDatabase(props[key], data[key]));
        }
    }.bind(this));
    return fields.join(',');
};

function dateToMysql(val) {
    return val.getUTCFullYear() + '-' +
        fillZeros(val.getUTCMonth() + 1) + '-' +
        fillZeros(val.getUTCDate()) + ' ' +
        fillZeros(val.getUTCHours()) + ':' +
        fillZeros(val.getUTCMinutes()) + ':' +
        fillZeros(val.getUTCSeconds());

    function fillZeros(v) {
        return v < 10 ? '0' + v : v;
    }
}

MySQL.prototype.toDatabase = function (prop, val) {
    // Note: values have already passed through AbstractClass._forDB().
    if (val === null) return 'NULL';
    if (prop.type.name === 'Updated') return 'NULL';
    if (val.constructor && val.constructor.name === 'Object') {
        var operator = Object.keys(val)[0]
        val = val[operator];
        if (operator === 'between') {
            return  this.toDatabase(prop, val[0]) +
                    ' AND ' +
                    this.toDatabase(prop, val[1]);
        } else if (operator == 'inq' || operator == 'nin') {
            if (!(val.propertyIsEnumerable('length')) && typeof val === 'object' && typeof val.length === 'number') { //if value is array
                for (var i = 0; i < val.length; i++) {
                    val[i] = this.client.escape(val[i]);
                }
                return val.join(',');
            } else {
                return val;
            }
        }
    }
    if (!prop) return val;
    if (prop.type.name === 'Number') return val;
    if (prop.type.name === 'Date' || prop.type.name === 'Created') {
        if (!val) return 'NULL';
        if (!val.toUTCString) {
            val = new Date(val);
        }
        return '"' + dateToMysql(val) + '"';
    }
    if (prop.type.name == "Boolean") return val ? 1 : 0;
    return this.client.escape(val.toString());
};

MySQL.prototype.fromDatabase = function (model, data) {
    if (!data) return null;
    var props = this._models[model].properties;
    Object.keys(data).forEach(function (key) {
        var val = data[key];
        if (props[key]) {
            if (props[key].type.name === 'Date' && val !== null) {
                val = new Date(val.toString().replace(/GMT.*$/, 'GMT'));
            }
        }
        data[key] = val;
    });
    return data;
};

MySQL.prototype.escapeName = function (name) {
    return '`' + name.replace(/\./g, '`.`') + '`';
};

MySQL.prototype.all = function all(model, filter, callback) {

    var sql = 'SELECT * FROM ' + this.tableEscaped(model);
    var self = this;
    var props = this._models[model].properties;

    if (filter) {

        if (filter.where) {
            sql += ' ' + buildWhere(filter.where);
        }

        if (filter.order) {
            sql += ' ' + buildOrderBy(filter.order);
        }

        if (filter.limit) {
            sql += ' ' + buildLimit(filter.limit, filter.offset || 0);
        }

    }

    this.query(sql, function (err, data) {
        if (err) {
            return callback(err, []);
        }

        var objs = data.map(function (obj) {
            return self.fromDatabase(model, obj);
        });
        if (filter && filter.include) {
            this._models[model].model.include(objs, filter.include, callback);
        } else {
            callback(null, objs);
        }
    }.bind(this));

    return sql;

    function buildWhere(conds) {
        var cs = [];
        Object.keys(conds).forEach(function (key) {
            var keyEscaped = '`' + key.replace(/\./g, '`.`') + '`'
            var val = self.toDatabase(props[key], conds[key]);
            if (conds[key] === null) {
                cs.push(keyEscaped + ' IS NULL');
            } else if (conds[key].constructor.name === 'Object') {
                var condType = Object.keys(conds[key])[0];
                var sqlCond = keyEscaped;
                if ((condType == 'inq' || condType == 'nin') && val.length == 0) {
                    cs.push(condType == 'inq' ? 0 : 1);
                    return true;
                }
                switch (condType) {
                    case 'gt':
                        sqlCond += ' > ';
                        break;
                    case 'gte':
                        sqlCond += ' >= ';
                        break;
                    case 'lt':
                        sqlCond += ' < ';
                        break;
                    case 'lte':
                        sqlCond += ' <= ';
                        break;
                    case 'between':
                        sqlCond += ' BETWEEN ';
                        break;
                    case 'inq':
                        sqlCond += ' IN ';
                        break;
                    case 'nin':
                        sqlCond += ' NOT IN ';
                        break;
                    case 'neq':
                        sqlCond += ' != ';
                        break;
                }
                sqlCond += (condType == 'inq' || condType == 'nin') ? '(' + val + ')' : val;
                cs.push(sqlCond);
            } else {
                cs.push(keyEscaped + ' = ' + val);
            }
        });
        if (cs.length === 0) {
          return '';
        }
        return 'WHERE ' + cs.join(' AND ');
    }

    function buildOrderBy(order) {
        if (typeof order === 'string') order = [order];
        return 'ORDER BY ' + order.join(', ');
    }

    function buildLimit(limit, offset) {
        return 'LIMIT ' + (offset ? (offset + ', ' + limit) : limit);
    }

};

MySQL.prototype.autoupdate = function (cb) {
    var self = this;
    var wait = 0;
    Object.keys(this._models).forEach(function (model) {
        wait += 1;
        self.query('SHOW FIELDS FROM ' + self.tableEscaped(model), function (err, fields) {
            self.query('SHOW INDEXES FROM ' + self.tableEscaped(model), function (err, indexes) {
                if (!err && fields.length) {
                    self.alterTable(model, fields, indexes, done);
                } else {
                    self.createTable(model, done);
                }
            });
        });
    });

    function done(err) {
        if (err) {
            console.log(err);
        }
        if (--wait === 0 && cb) {
            cb();
        }
    }
};

MySQL.prototype.isActual = function (cb) {
    var ok = false;
    var self = this;
    var wait = 0;
    Object.keys(this._models).forEach(function (model) {
        wait += 1;
        self.query('SHOW FIELDS FROM ' + model, function (err, fields) {
            self.query('SHOW INDEXES FROM ' + model, function (err, indexes) {
                self.alterTable(model, fields, indexes, done, true);
            });
        });
    });

    function done(err, needAlter) {
        if (err) {
            console.log(err);
        }
        ok = ok || needAlter;
        if (--wait === 0 && cb) {
            cb(null, !ok);
        }
    }
};

MySQL.prototype.alterTable = function (model, actualFields, actualIndexes, done, checkOnly) {
    var self = this;
    var m = this._models[model];
    var propNames = Object.keys(m.properties).filter(function (name) {
        return !!m.properties[name];
    });
    var indexNames = m.settings.indexes ? Object.keys(m.settings.indexes).filter(function (name) {
        return !!m.settings.indexes[name];
    }) : [];
    var sql = [];
    var ai = {};

    if (actualIndexes) {
        actualIndexes.forEach(function (i) {
            var name = i.Key_name;
            if (!ai[name]) {
                ai[name] = {
                    info: i,
                    columns: []
                };
            }
            ai[name].columns[i.Seq_in_index - 1] = i.Column_name;
        });
    }
    var aiNames = Object.keys(ai);

    // change/add new fields
    propNames.forEach(function (propName) {
        if (propName === 'id') return;
        var found;
        actualFields.forEach(function (f) {
            if (f.Field === propName) {
                found = f;
            }
        });

        if (found) {
            actualize.call(self, propName, found);
        } else {
            sql.push('ADD COLUMN `' + propName + '` ' + self.propertySettingsSQL(model, propName));
        }
    });

    // drop columns
    actualFields.forEach(function (f) {
        var notFound = !~propNames.indexOf(f.Field);
        if (f.Field === 'id') return;
        if (notFound || !m.properties[f.Field]) {
            sql.push('DROP COLUMN `' + f.Field + '`');
        }
    });

    // remove indexes
    aiNames.forEach(function (indexName) {
        if (indexName === 'id' || indexName === 'PRIMARY') return;
        if (indexNames.indexOf(indexName) === -1 && !m.properties[indexName] || m.properties[indexName] && !m.properties[indexName].index) {
            sql.push('DROP INDEX `' + indexName + '`');
        } else {
            // first: check single (only type and kind)
            if (m.properties[indexName] && !m.properties[indexName].index) {
                // TODO
                return;
            }
            // second: check multiple indexes
            var orderMatched = true;
            if (indexNames.indexOf(indexName) !== -1) {
                m.settings.indexes[indexName].columns.split(/,\s*/).forEach(function (columnName, i) {
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
    propNames.forEach(function (propName) {
        var i = m.properties[propName].index;
        if (!i) {
            return;
        }
        var found = ai[propName] && ai[propName].info;
        if (!found) {
            var type = '';
            var kind = '';
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
    indexNames.forEach(function (indexName) {
        var i = m.settings.indexes[indexName];
        var found = ai[indexName] && ai[indexName].info;
        if (!found) {
            var type = '';
            var kind = '';
            if (i.type) {
                type = 'USING ' + i.type;
            }
            if (i.kind) {
                kind = i.kind;
            }
            if (kind && type) {
                sql.push('ADD ' + kind + ' INDEX `' + indexName + '` (' + i.columns + ') ' + type);
            } else {
                sql.push('ADD ' + kind + ' INDEX ' + type + ' `' + indexName + '` (' + i.columns + ')');
            }
        }
    });

    if (sql.length) {
        var query = 'ALTER TABLE ' + self.tableEscaped(model) + ' ' + sql.join(',\n');
        if (checkOnly) {
            done(null, true, {statements: sql, query: query});
        } else {
            this.query(query, done);
        }
    } else {
        done();
    }

    function actualize(propName, oldSettings) {
        var newSettings = m.properties[propName];
        if (newSettings && changed.call(this, newSettings, oldSettings)) {
            sql.push('CHANGE COLUMN `' + propName + '` `' + propName + '` ' + self.propertySettingsSQL(model, propName));
        }
    }

    function changed(newSettings, oldSettings) {
        if (oldSettings.Null === 'YES' && (newSettings.allowNull === false || newSettings.null === false)) return true;
        if (oldSettings.Null === 'NO' && !(newSettings.allowNull === false || newSettings.null === false)) return true;
        if (oldSettings.Type.toUpperCase() !== datatype.call(this, newSettings).toUpperCase()) return true;
        return false;
    }
};

MySQL.prototype.propertiesSQL = function (model) {
    var self = this;
    // Marginally better to use unsigned int for auto increment. 
    var sql = ['`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY'];
    Object.keys(this._models[model].properties).forEach(function (prop) {
        if (prop === 'id') return;
        sql.push('`' + prop + '` ' + self.propertySettingsSQL(model, prop));
    });
    // Declared in model index property indexes.
    Object.keys(this._models[model].properties).forEach(function (prop) {
        var i = self._models[model].properties[prop].index;
        if (i) {
            sql.push(self.singleIndexSettingsSQL(model, prop));
        }
    });
    // Settings might not have an indexes property.
    var dxs = this._models[model].settings.indexes;
    if (dxs) {
        Object.keys(this._models[model].settings.indexes).forEach(function(prop) {
            sql.push(self.indexSettingsSQL(model, prop));
        });
    }
    return sql.join(',\n  ');
};

MySQL.prototype.singleIndexSettingsSQL = function (model, prop) {
    // Recycled from alterTable single column indexes above, more or less.
    var i = this._models[model].properties[prop].index;
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
};

MySQL.prototype.indexSettingsSQL = function (model, prop) {
    // Recycled from alterTable multi-column indexes above, more or less.
    var i = this._models[model].settings.indexes[prop];
    var type = '';
    var kind = '';
    if (i.type) {
        type = 'USING ' + i.type;
    }
    if (i.kind) {
        kind = i.kind;
    }
    if (kind && type) {
        return (kind + ' INDEX `' + prop + '` (' + i.columns + ') ' + type);
    } else {
        return (kind + ' INDEX ' + type + ' `' + prop + '` (' + i.columns + ')');
    }
};

MySQL.prototype.propertySettingsSQL = function (model, prop) {
    var p = this._models[model].properties[prop];
    return datatype.call(this, p) + options.call(this, p);
};

function defaultInt(p) {
    var dt = '';
    if (p.hasOwnProperty('default') && ('' + p.default).length > 0) {
        var tmp = parseInt(p.default, 10);
        if (!isNaN(tmp)) {
            dt += ' DEFAULT ' + tmp;
        }
    }
    return dt;
}

function defaultUint(p) {
    var dt = '';
    if (p.hasOwnProperty('default') && ('' + p.default).length > 0) {
        var tmp = parseInt(p.default, 10);
        if (!isNaN(tmp) && tmp >= 0) {
            dt += ' DEFAULT ' + tmp;
        }
    }
    return dt;
}

function defaultString(p) {
    return (p.hasOwnProperty('default') && p.default.length > 0 ? ' DEFAULT ' + p.default : '');
}

function allowNull(p) {
    return (p.allowNull === false || p['null'] === false ? ' NOT NULL ' : ' NULL ');
}

// Options separate from datatype due to alterTable.changed()
function options(p) {
    var opt = '';
    switch (p.type.name) {
        default:
        case 'String':
        case 'JSON':
        opt += defaultString(p);
        opt += allowNull(p); 
        break;
        
        // Most options not allowed on this kind of column.
        case 'Text':
        break;
        
        case 'Char':
        opt += defaultString(p);
        opt += allowNull(p);
        break;
        
        // Currently NOT supporting (M, D) syntax for this.
        case 'Number': // Since javascript 'Number' can be a float, seems like it should map to FLOAT in mysql.
        case 'Float':
        if (p.hasOwnProperty('default') && ('' + p.default).length > 0) {
            var tmp = parseFloat(p.default);
            if (!isNaN(tmp)) {
                opt += ' DEFAULT ' + tmp;
            }
        }
        opt += allowNull(p);
        break;
        
        case 'Int':
        opt += defaultInt(p);
        opt += allowNull(p);
        break;
        
        case 'Uint':
        opt += defaultUint(p);
        opt += allowNull(p);
        break;
        
        case 'Date':
        opt += allowNull(p);
        break;
        
        // If you don't have mysql version >= 5.6.x you can't have both Updated and Created in the same model.
        // Currently Updated/Created forced to not allow Null. If you don't unit tests will fail.
        case 'Updated':
        opt = ' DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL';
        p.allowNull = false;
        break;
        
        case 'Created':
        opt = ' DEFAULT CURRENT_TIMESTAMP NOT NULL';
        p.allowNull = false;
        break;
        
        case 'Boolean':
        if (p.hasOwnProperty('default') && (p.default === false || p.default === true)) {
            if (p.default) {
                opt += ' DEFAULT 1';
            } else {
                opt += ' DEFAULT 0';
            }
        }
        opt += allowNull(p);
        break;
        
        // MediumInt could be added similarly to Small and Tiny, but in general it is much less useful.
        
        case 'SmallInt':
        opt += defaultInt(p);
        opt += allowNull(p);
        break;
        
        case 'SmallUint':
        opt += defaultUint(p);
        opt += allowNull(p);
        break;
        
        case 'TinyInt':
        opt += defaultInt(p);
        opt += allowNull(p);
        break;
        
        case 'TinyUint':
        opt += defaultUint(p);
        opt += allowNull(p);
        break;
        
        case 'Enum':
        opt += allowNull(p);
        break;
        
        case 'Set':
        opt += allowNull(p);
        break;
        

        case 'Decimal':
        if (p.hasdefault && ('' + p.default).length > 0) {
            var tmp = parseFloat(p.default);
            if (!isNaN(tmp)) {
                opt += ' DEFAULT ' + tmp;
            }
        }
        opt += allowNull(p);
        break;
        
        case 'Point':
        opt += allowNull(p);
        break;
        
    }
    return opt;
    
}

function datatype(p) {
    var dt = '';
    switch (p.type.name) {
        default:
        case 'String':
        case 'JSON':
        dt = 'VARCHAR(' + (p.limit || 255) + ')';
        break;
        
        case 'Text':
        dt = 'MEDIUMTEXT'; // For UTF8MB4 sites TEXT might be too small.
        break;
        
        case 'Char':
        dt = 'CHAR(' + (p.limit || 255) + ')';
        break;
        
        // Currently NOT supporting (M, D) syntax for this. (Could be done similar to how Decimal is done.)
        case 'Number': // Since javascript 'Number' can be a float, seems like it should map to FLOAT in mysql.
        case 'Float':
        dt = 'FLOAT';
        break;
        
        case 'Int':
        dt = 'INT(' + (p.limit || 11) + ')';
        break;
        
        case 'Uint':
        dt = 'INT(' + (p.limit || 10) + ') UNSIGNED';
        break;
        
        case 'Date':
        dt = 'DATETIME';
        break;
        
        // If you don't have mysql version >= 5.6.x you can't have both Updated and Created in the same model.
        
        case 'Updated':
        case 'Created':
        dt = 'TIMESTAMP';
        break;
        
        case 'Boolean':
        dt = 'TINYINT(1) UNSIGNED';
        break;
        
        // MediumInt could be added similarly to Small and Tiny, but in general it is much less useful.
        
        case 'SmallInt':
        dt = 'SMALLINT(' + (p.limit || 5) + ')';
        break;
        
        case 'SmallUint':
        dt = 'SMALLINT(' + (p.limit || 5) + ') UNSIGNED';
        break;
        
        case 'TinyInt':
        dt = 'TINYINT(' + (p.limit || 3) + ')';
        break;
        
        case 'TinyUint':
        dt = 'TINYINT(' + (p.limit || 3) + ') UNSIGNED';
        break;
        
        // This won't work in alterTable unless the patch-1 pull request for node-mysql goes through. (node-mysql pull request patch-1 - 820f79d)
        case 'Enum':
        var choices;
        if (p.choices && Array.isArray(p.choices)) {
            choices = this.schema.client.escape(p.choices, true);
        }
        dt = 'ENUM(' + (choices || "''") + ')';
        break;
        
        case 'Set':
        var members;
        if (p.members && Array.isArray(p.members)) {
            members = this.schema.client.escape(p.members, true);
        }
        dt = 'SET(' + (members || "''") + ')';
        break;

        case 'Decimal':
        var limit = "9,2";
        if (p.limit && Array.isArray(p.limit) && p.limit.length === 2) {
            var l0 = parseInt(p.limit[0]);
            var l1 = parseInt(p.limit[1]);
            if (l0 > 0 && l1 >= 0 && l0 >= l1) {
                limit = (l0 + ',' + l1);
            }
        }
        dt = 'DECIMAL(' + limit + ')';
        break;
        
        case 'Point':
        dt = 'POINT';
        break;
        
    }
    return dt;
}

// MySQL specific column types declared

function Char() {};
Char.parse = function(arg) {
    return String(arg);
};

function Float() {};
Float.parse = function(arg) {
    return parseFloat(arg);
};

function Int() {};
Int.parse = function(arg) {
    return parseInt(arg, 10);
};

function Uint() {};
Uint.parse = function(arg) {
    return parseInt(arg, 10);
};

function Updated() {};
Updated.parse = function(arg) {
    if (arg) return new Date(arg);
    return null;
};

function Created() {};
Created.parse = function(arg) {
    if (arg) return new Date(arg);
    return null;
};

function SmallInt() {};
SmallInt.parse = function(arg) {
    return parseInt(arg, 10);
};

function SmallUint() {};
SmallUint.parse = function(arg) {
    return parseInt(arg, 10);
};

function TinyInt() {};
TinyInt.parse = function(arg) {
    return parseInt(arg, 10);
};

function TinyUint() {};
TinyUint.parse = function(arg) {
    return parseInt(arg, 10);
};

function Enum() {};
Enum.parse = function(arg) {
    return String(arg);
};

function Set() {};
Set.parse = function(arg) {
    return String(arg);
};

function Decimal() {};
Decimal.parse = function(arg) {
    // Alternative might be to use arbitrary precission lib.
    return parseFloat(arg);
}

function Point() {};
Point.parse = function(arg) {
    return String(arg);
};

var types = {
    Char: Char,
    Float: Float,
    Int: Int,
    Uint: Uint,
    Updated: Updated,
    Created: Created,
    SmallInt: SmallInt,
    SmallUint: SmallUint,
    TinyInt: TinyInt,
    TinyUint: TinyUint,
    Enum: Enum,
    Set: Set,
    Decimal: Decimal,
    Point: Point
};
