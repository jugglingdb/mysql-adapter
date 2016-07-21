'use strict';

const expect = require('expect');
const Schema = require('jugglingdb').Schema;

const db = new Schema(require('../'), {
    database: 'myapp_test',
    username: 'root'
});

describe('update', () => {

    let Model;

    before(() => {
        Model = db.define('Model', {
            foo: String,
            bar: Number
        });

        return db.automigrate();
    });

    afterEach(() => Model.destroyAll());

    context('single update', () => {

        it('should throw when no sufficient params provided', () => {
            return Model.update({ where: { foo: 1 }})
                .then(() => { throw new Error('Unexpected success'); })
                .catch(err => expect(err.message).toBe('Required update'));
        });

        it('should throw when no sufficient params provided', () => {
            return Model.update({ update: { foo: 1 }})
                .then(() => { throw new Error('Unexpected success'); })
                .catch(err => expect(err.message).toBe('Required where'));
        });

        it('should update record in database', () => {
            return Model.create([
                { foo: 'baz', bar: 1 },
                { foo: 'fuu', bar: 1 }
            ])
                .then(() => Model.update({
                    update: { bar: 2 },
                    where: { foo: 'fuu' }
                }))
                .then(() => Model.all({ where: { foo: 'fuu' }}))
                .then(records => {
                    expect(records.length).toBe(1);
                    expect(records[0].bar).toBe(2);
                })
                .then(() => Model.all({ where: { foo: 'baz' }}))
                .then(records => {
                    expect(records.length).toBe(1);
                    expect(records[0].bar).toBe(1);
                });
        });

        it('should allow to limit update', () => {
            return Model.create([
                { foo: 'bar', bar: 1 },
                { foo: 'bar', bar: 1 }
            ])
                .then(() => Model.update({
                    update: { bar: 2 },
                    where: { foo: 'bar' },
                    limit: 1
                }))
                .then(() => Model.count({ bar: 2 }))
                .then(count => {
                    expect(count).toBe(1);
                })
                .then(() => Model.count({ bar: 1 }))
                .then(count => {
                    expect(count).toBe(1);
                });
        });

    });

});

