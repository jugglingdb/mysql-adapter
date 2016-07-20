'use strict';

const {
    Schema
} = require('jugglingdb');

const expect = require('expect');

const db = new Schema(require('../'), {
    pool: true,
    username: 'root',
    database: 'myapp_test'
});

describe('pool', () => {

    it('allows to perform query', () => {
        return db.adapter.query('SELECT 1 as response')
            .then(res => {
                expect(res[0].response).toBe(1);
            });
    });

    it('should quit', () => {
        return db.adapter.closeConnection();
    });

});

