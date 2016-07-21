const should = require('./init.js');

const expect = require('expect');

/* global getSchema */

const db = getSchema();
const CreditCard = db.define('CreditCard', function(m) {
    m.property('id', String);
    m.property('number', String);
    m.set('uuid', 'v4');
});


describe('uuid', function() {

    it('should run migration', () => db.automigrate());

    it('should be used in id', function() {
        return CreditCard.create({number: '4111111111111111'})
            .then(function(cc) {
                should.exist(cc.id, 'id is missing');
                cc.id.length.should.equal(36);
            });
    });

    it('should update schema on alterTable int => uuid', () => {
        db.define('Model', { a: String });
        return db.automigrate()
            .then(() => {
                const settings = db.models['Model'].settings;
                settings.uuid = 'v4';
                return db.isActual();
            })
            .then(isActual => expect(isActual).toBe(false))
            .then(() => db.adapter.getTableInfo('Model'))
            .then(info => {
                const sql = db.adapter.buildAlterTableSQL('Model', info.fields, info.indexes);
                expect(sql[0]).toBe('CHANGE COLUMN `id` `id` CHAR(36) NOT NULL');
            });
    });

    it('should update schema on alterTable uuid => int', () => {
        db.define('Model', { a: String }, { uuid: 'v4' });
        return db.automigrate()
            .then(() => {
                const settings = db.models['Model'].settings;
                delete settings.uuid;
                return db.isActual();
            })
            .then(isActual => expect(isActual).toBe(false))
            .then(() => db.adapter.getTableInfo('Model'))
            .then(info => {
                const sql = db.adapter.buildAlterTableSQL('Model', info.fields, info.indexes);
                expect(sql[0]).toBe('CHANGE COLUMN `id` `id` INT(11) NOT NULL AUTO_INCREMENT');
            });
    });

});
