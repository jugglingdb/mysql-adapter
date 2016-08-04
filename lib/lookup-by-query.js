'use strict';

const queryBuilder = require('./query-builder');

module.exports = function(informationSchema, db) {

    const {
        tableName,
        getModel,
        castObjectFromDb
    } = informationSchema;

    const {
        query,
    } = db;

    const {
        buildWhere,
        buildAttributes
    } = queryBuilder(informationSchema);

    return {
        count,
        all
    };

    function all(model, filter) {
        const table = tableName(model);
        const queryParams = [];

        const attributes = buildAttributes(model, filter && filter.attributes, queryParams);

        let sql = `SELECT ${ attributes } FROM ${ table }`;

        if (filter) {

            if (filter.where) {
                sql += ' ' + buildWhere(model, filter.where, queryParams, true);
            }

            if (filter.group) {
                sql += ' ' + buildGroupBy(filter.group);
            }

            if (filter.order) {
                sql += ' ' + buildOrderBy(filter.order);
            }

            if (filter.limit) {
                sql += ' ' + buildLimit(filter.limit, filter.offset || 0);
            }

        }

        return query(sql, queryParams)
            .then(records => {
                const objs = records.map(record => castObjectFromDb(model, record));
                if (filter && filter.include) {
                    return new Promise((resolve, reject) => {
                        getModel(model).model.include(objs, filter.include, (err, result) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(result);
                            }
                        });
                    });
                }

                return objs;
            });

        function buildOrderBy(order) {
            if (typeof order === 'string') {
                order = [order];
            }
            return 'ORDER BY ' + order.map(o => {
                const t = o.split(/\s+/);
                if (t.length === 1) {
                    return '`' + o + '`';
                }
                return '`' + t[0] + '` ' + t[1];
            }).join(', ');
        }

        function buildGroupBy(group) {
            if (typeof group === 'string') {
                group = [group];
            }

            return 'GROUP BY ' + group.map(o => {
                const t = o.split(/\s+/);
                if (t.length === 1) {
                    return '`' + o + '`';
                }
                return '`' + t[0] + '` ' + t[1];
            }).join(', ');
        }

        function buildLimit(limit, offset) {
            return 'LIMIT ' + (offset ? (offset + ', ' + limit) : limit);
        }

    }

    function count(model, where) {
        const table = tableName(model);
        const queryParams = [];
        where = buildWhere(model, where, queryParams);

        if (where) {
            where = 'WHERE ' + where;
        }

        const sql = `SELECT count(*) as cnt FROM ${table} ${where}`;

        return query(sql, queryParams)
            .then(result => result[0].cnt);

    }

};
