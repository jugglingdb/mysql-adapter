'use strict';

const assert = require('assert');

module.exports = function(informationSchema) {

    const {
        castForDb,
        escapeKey,
        isDefinedProperty
    } = informationSchema;

    return {
        buildWhere,
        buildAttributes
    };

    function buildAttributes(model, attributes, queryParams) {
        if (!attributes) {
            return '*';
        }

        // allow both { attributes: 'id'} and { attributes: [ 'name', 'email' ] }
        if (!Array.isArray(attributes)) {
            attributes = [attributes];
        }

        [].splice.apply(queryParams, [ queryParams.length, 0 ].concat(
            attributes
        ));

        return attributes.map(() => '??');
    }

    function buildWhere(model, conds = {}, queryParams, addWhere) {
        if (!conds) {
            return '';
        }

        let where = Object.keys(conds)
            .map(key => buildCondition(model, key, conds[key], queryParams))
            .join(' AND ');

        if (addWhere && where) {
            where = `WHERE ${ where }`;
        }

        return where;
    }

    function buildCondition(model, key, value, queryParams) {
        if (isExpressionKey(key)) {
            return buildExpression(model, key, value, queryParams);
        }

        assert(isDefinedProperty(model, key), `Unknown condition key ${ key }`);

        if (value === null) {
            return `${ escapedKey(key) } IS NULL`;
        }

        if (value instanceof Array) {
            value = { inq: value };
        }

        if (typeof value === 'object' && value) {
            const keys = Object.keys(value);
            const key = keys.shift();
            assert.equal(keys.length, 0,
                `Only one key allowed in ${ key } condition, but given extra ${ keys.join(', ') }`);

            return trivial(key, value[key]) || nonTrivial(key, value[key]);
        }

        queryParams.push(castForDb(model, key, value));
        return `${ escapedKey(key) } = ?`;

        // zero-length inclusion and exclusion are effectively trivial 0 or 1
        function trivial(operator, operands) {
            if ([ 'inq', 'nin' ].includes(operator) && !operands.length) {
                return operator === 'inq' ? '0' : '1';
            }
        }

        function nonTrivial(conditionType, operand) {

            const conditions2op = {
                gt: '>',
                gte: '>=',
                ne: '!=',
                lt: '<',
                lte: '<=',
                like: 'LIKE',
                nlike: 'NOT LIKE'
            };

            const conditionsSet = {
                inq: 'IN',
                nin: 'NOT IN'
            };

            if (conditionType === 'between') {
                assert.equal(operand.length, 2, 'Between expects two operands');
                queryParams.push(castForDb(model, key, operand[0]));
                queryParams.push(castForDb(model, key, operand[1]));
                return `${ escapedKey(key) } BETWEEN ? AND ?`;
            }

            if (conditionType in conditionsSet) {
                [].splice.apply(queryParams, [
                    queryParams.length, 0
                ].concat(operand.map(value => castForDb(model, key, value))));
                return `${ escapedKey(key) } ${ conditionsSet[conditionType] } (
                    ${ operand.map(() => '?').join(', ') }
                )`;
            }

            if (conditionType in conditions2op) {
                queryParams.push(castForDb(model, key, operand));
                return `${ escapedKey(key) } ${ conditions2op[conditionType] } ?`;
            }

            throw new Error(`Condition type "${ conditionType }" is not supported`);
        }

    }

    function escapedKey(key) {
        return key.split('.').map(escapeKey).join('.');
    }

    function isExpressionKey(key) {
        return [ 'or', 'xor', 'not', 'and' ].includes(key);
    }

    function buildExpression(model, key, cases, queryParams) {
        assert(isExpressionKey(key), `Is expression key: ${ key }`);

        if (key === 'not') {
            // assert.equal(cases.length, 1, 'Not ony operates with single operand');
            return `( NOT (${ buildWhere(model, cases, queryParams) }) )`;
        }

        const alternatives = cases.map(c => buildWhere(model, c, queryParams));
        return `(${ alternatives.join(` ${ key.toUpperCase() } `) })`;
    }

};

