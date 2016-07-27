require('./init.js');
const assert = require('assert');
const expect = require('expect');

/* global getSchema */
/* eslint max-nested-callbacks: [2, 5] */

describe('MySQL specific datatypes', () => {

    let db;

    beforeEach(() => db = getSchema());

    afterEach(() => db.disconnect());

    describe('enum', () => {

        let EnumModel, ANIMAL_ENUM;

        beforeEach(() => {

            ANIMAL_ENUM = db.EnumFactory('dog', 'cat', 'mouse');

            EnumModel = db.define('EnumModel', {
                animal: {
                    type: ANIMAL_ENUM,
                    null: false
                },
                condition: {
                    type: db.EnumFactory('hungry', 'sleepy', 'thirsty')
                },
                mood: {
                    type: db.EnumFactory('angry', 'happy', 'sad')
                }
            });

            return db.automigrate();
        });

        it('An enum should parse itself', () => {
            assert.equal(ANIMAL_ENUM.CAT, ANIMAL_ENUM('cat'));
            assert.equal(ANIMAL_ENUM.CAT, ANIMAL_ENUM('CAT'));
            assert.equal(ANIMAL_ENUM.CAT, ANIMAL_ENUM(2));
            assert.equal(ANIMAL_ENUM.CAT, 'cat');
            assert.equal(ANIMAL_ENUM(null), null);
            assert.equal(ANIMAL_ENUM(''), '');
            assert.equal(ANIMAL_ENUM(0), '');
        });

        it('should create a model instance with Enums', () => {
            return EnumModel.create({
                animal: ANIMAL_ENUM.CAT,
                condition: 'sleepy',
                mood: 'happy'
            })
                .then(obj => {
                    assert.equal(obj.condition, 'sleepy');
                    return EnumModel.findOne({
                        where: { animal: ANIMAL_ENUM.CAT }
                    });
                })
                .then(found => {
                    assert.equal(found.mood, 'happy');
                    assert.equal(found.animal, ANIMAL_ENUM.CAT);
                });
        });

    // wtf?
    // it.skip('should fail spectacularly with invalid enum values', function(done) {
    //    var em = EnumModel.create({animal: 'horse', condition: 'sleepy', mood: 'happy'}, function(err, obj) {
    //         assert.ok(!err);
    //         EnumModel.find(obj.id, function(err, found){
    //             assert.ok(!err);
    //             assert.equal(found.animal, ''); // MySQL fun.
    //             assert.equal(found.animal, 0);
    //             done();
    //         });
    //    });
    // });

    // it.skip('should limit the length of string fields', function(done) {
    //    var em = EnumModel.create({animal: ANIMAL_ENUM.CAT, condition: 'sleepy', mood: 'happy', name : "penny"}, function(err, obj) {
    //        console.log(err);
    //         assert.ok(!err);
    //         EnumModel.find(obj.id, function(err, found){
    //             assert.ok(!err);
    //             assert.equal(found.name, 'pen');
    //             done();
    //         });
    //    });
    // });

    });

    describe('string', () => {

        beforeEach(() => {
            db.define('Model', {
                name: {
                    type : String,
                    length : 3,
                    charset: 'latin1',
                    collation: 'latin1_general_ci',
                    index: true
                }
            });

            return db.automigrate();
        });

        it('should be varchar by default', () => {
            return db.adapter.getTableInfo('Model')
                .then(info => {
                    const field = info.fields.find(f => f.Field === 'name');
                    expect(field).toExist();
                    expect(field.Type).toBe('varchar(3)');
                    expect(field.Null).toBe('YES');
                    expect(info.sql).toContain(
                        '`name` varchar(3) CHARACTER SET latin1 COLLATE latin1_general_ci'
                    );
                });
        });

    });

});
