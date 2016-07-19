const should = require('./init.js');

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

});
