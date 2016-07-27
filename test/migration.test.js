'use strict';

/* global getSchema */
/* eslint max-nested-callbacks: [2, 5] */

const should = require('./init.js');
const expect = require('expect');
let db = getSchema();
const assert = require('assert');
const Schema = require('jugglingdb').Schema;

let UserData, NumberData, DateData;

describe('migrations', () => {

    before(setup);

    it('UserData should have correct columns', done => {
        getFields('UserData', (err, fields) => {
            should.not.exist(err);
            assert.deepEqual(fields, {
                id: {
                    Field:'id',
                    Type:'int(11)',
                    Null:'NO',
                    Key:'PRI',
                    Default:null,
                    Extra:'auto_increment'
                },
                email:{
                    Field:'email',
                    Type:'varchar(100)',
                    Null:'NO',
                    Key:'MUL',
                    Default:null,
                    Extra:''
                },
                name:{
                    Field:'name',
                    Type:'varchar(255)',
                    Null:'YES',
                    Key:'',
                    Default:null,
                    Extra:''
                },
                bio:{
                    Field:'bio',
                    Type:'longtext',
                    Null:'YES',
                    Key:'',
                    Default:null,
                    Extra:''
                },
                order:{
                    Field:'order',
                    Type:'int(11)',
                    Null:'YES',
                    Key:'',
                    Default:null,
                    Extra:''
                },
                birthDate:{
                    Field:'birthDate',
                    Type:'datetime',
                    Null:'YES',
                    Key:'',
                    Default:null,
                    Extra:''
                },
                pendingPeriod:{
                    Field:'pendingPeriod',
                    Type:'int(11)',
                    Null:'YES',
                    Key:'',
                    Default:null,
                    Extra:''
                },
                createdByAdmin:{
                    Field:'createdByAdmin',
                    Type:'tinyint(1)',
                    Null:'YES',
                    Key:'',
                    Default:null,
                    Extra:''
                }
            });
            done();
        });
    });

    it('UserData should have correct indexes', done => {
        // Note: getIdexes truncates multi-key indexes to the first member. Hence index1 is correct.
        getIndexes('UserData', (err, fields) => {
            assert.deepEqual(removeTableNames(fields), {
                PRIMARY: {
                    'Non_unique': 0,
                    'Key_name': 'PRIMARY',
                    'Seq_in_index': 1,
                    'Column_name': 'id',
                    'Collation': 'A',
                    'Cardinality': 0,
                    'Sub_part': null,
                    'Packed': null,
                    'Null': '',
                    'Index_type': 'BTREE',
                    'Comment': '',
                    'Index_comment': ''
                },
                email: {
                    'Non_unique': 1,
                    'Key_name': 'email',
                    'Seq_in_index': 1,
                    'Column_name': 'email',
                    'Collation': 'A',
                    'Cardinality': 0,
                    'Sub_part': null,
                    'Packed': null,
                    'Null': '',
                    'Index_type': 'BTREE',
                    'Comment': '',
                    'Index_comment': ''
                },
                index0: {
                    'Non_unique': 1,
                    'Key_name': 'index0',
                    'Seq_in_index': 1,
                    'Column_name': 'email',
                    'Collation': 'A',
                    'Cardinality': 0,
                    'Sub_part': null,
                    'Packed': null,
                    'Null': '',
                    'Index_type': 'BTREE',
                    'Comment': '',
                    'Index_comment': ''
                }
            });
            done();
        });

        function removeTableNames(ixs) {
            Object.keys(ixs).forEach(name => {
                delete ixs[name].Table;
            });
            return ixs;
        }
    });

    it('StringData should have correct columns', done => {
        getFields('StringData', (err, fields) => {
            assert.deepEqual(fields, { id:
               { Field: 'id',
                 Type: 'int(11)',
                 Null: 'NO',
                 Key: 'PRI',
                 Default: null,
                 Extra: 'auto_increment' },
              smallString:
               { Field: 'smallString',
                 Type: 'char(127)',
                 Null: 'NO',
                 Key: 'MUL',
                 Default: null,
                 Extra: '' },
              mediumString:
               { Field: 'mediumString',
                 Type: 'varchar(255)',
                 Null: 'NO',
                 Key: '',
                 Default: null,
                 Extra: '' },
              tinyText:
               { Field: 'tinyText',
                 Type: 'tinytext',
                 Null: 'YES',
                 Key: '',
                 Default: null,
                 Extra: '' },
              giantJSON:
               { Field: 'giantJSON',
                 Type: 'longtext',
                 Null: 'YES',
                 Key: '',
                 Default: null,
                 Extra: '' },
              text:
               { Field: 'text',
                 Type: 'varchar(1024)',
                 Null: 'YES',
                 Key: '',
                 Default: null,
                 Extra: '' }
            });
            done();
        });
    });

    it('NumberData should have correct columns', done => {
        getFields('NumberData', (err, fields) => {
            assert.deepEqual(fields, {
                id: {
                    Field: 'id',
                    Type: 'int(11)',
                    Null: 'NO',
                    Key: 'PRI',
                    Default: null,
                    Extra: 'auto_increment'
                },
                number: {
                    Field: 'number',
                    Type: 'decimal(10,3) unsigned',
                    Null: 'NO',
                    Key: 'MUL',
                    Default: null,
                    Extra: ''
                },
                tinyInt: {
                    Field: 'tinyInt',
                    Type: 'tinyint(2)',
                    Null: 'YES',
                    Key: '',
                    Default: null,
                    Extra: ''
                },
                mediumInt: {
                    Field: 'mediumInt',
                    Type: 'mediumint(8) unsigned',
                    Null: 'YES',
                    Key: '',
                    Default: null,
                    Extra: ''
                },
                floater: {
                    Field: 'floater',
                    Type: 'double(14,6)',
                    Null: 'YES',
                    Key: '',
                    Default: null,
                    Extra: ''
                }
            });
            done();
        });
    });

    it('DateData should have correct columns', done => {
        getFields('DateData', (err, fields) => {
            assert.deepEqual(fields, {
                id: {
                    Field: 'id',
                    Type: 'int(11)',
                    Null: 'NO',
                    Key: 'PRI',
                    Default: null,
                    Extra: 'auto_increment'
                },
                dateTime: {
                    Field: 'dateTime',
                    Type: 'datetime',
                    Null: 'YES',
                    Key: '',
                    Default: null,
                    Extra: ''
                },
                timestamp: {
                    Field: 'timestamp',
                    Type: 'timestamp',
                    Null: 'YES',
                    Key: '',
                    Default: null,
                    Extra: ''
                }
            });
            done();
        });
    });

    it('should autoupgrade', done => {
        const userExists = function(cb) {
            query('SELECT * FROM UserData', (err, res) => {
                cb(!err && res[0].email === 'test@example.com');
            });
        };

        UserData.create({ email: 'test@example.com', order: 1 }, (err, user) => {
            assert.ok(!err, 'Could not create user');
            should.exist(user);
            userExists(yep => {
                assert.ok(yep, 'User does not exist');
            });
            UserData.defineProperty('email', { type: String, length: 110 });
            UserData.defineProperty('name', { type: String, dataType: 'char', limit: 50 });
            UserData.defineProperty('newProperty', { type: Number, unsigned: true, dataType: 'bigInt' });
            // UserData.defineProperty('pendingPeriod', false); This will not work as expected.
            db.autoupdate(err => {
                should.not.exist(err);
                getFields('UserData', (err, fields) => {
                    // change nullable for email
                    assert.equal(fields.email.Null, 'YES', 'Email does not allow null');
                    // change type of name
                    assert.equal(fields.name.Type, 'char(50)', 'Name is not char(50)');
                    // add new column
                    assert.ok(fields.newProperty, 'New column was not added');
                    if (fields.newProperty) {
                        assert.equal(fields.newProperty.Type, 'bigint(20) unsigned', 'New column type is not bigint(20) unsigned');
                    }
                    // drop column - will not happen.
                    // assert.ok(!fields.pendingPeriod, 'Did not drop column pendingPeriod');
                    // user still exists
                    userExists(yep => {
                        assert.ok(yep, 'User does not exist');
                        done();
                    });
                });
            });
        });
    });

    // TODO: rewrite this test
    // it.skip('record should be single updated', done => {

    //         const userExists = function(cb) {
    //             query('SELECT * FROM UserData', function(err, res) {
    //                 cb(!err && res[0].email === 'yourname@newname.com');
    //             });
    //         }
    //
    //         UserData.update({where:{id:'1'}, update:{ email:'yourname@newname.com' }}  , function(err, o) {
    //
    //             assert.equal(err,null);

    //             userExists(function(yep) {
    //                     assert.ok(yep, 'Email has changed');
    //             });

    //             // err when where missing
    //             UserData.update({ update:{email:'yourname@newname.com' }}, function(err, o) {
    //                 assert.equal(err, "Required where", " no error when where field is missing ");
    //             });

    //             // err when where update
    //             UserData.update({where:{id:'1'}}, function(err, o) {
    //                 assert.equal(err, "Required update", " no error when update field is missing ");
    //             });

    //             // Update set null and not is null
    //             UserData.update({ update:{email:null }  ,where:{id:'1'} }, function(err, o) {
    //                 assert.equal(o.meta.changes, 1,"Update set null ");
    //                 done();
    //             });

    //         });
    // });

    // it.skip('record should be multi updated', done => {

    //     // Create second user
    //     UserData.create({email: 'helloworld-helloworld@example.com', order: 3}, function(err, user) {
    //         console.log(err);
    //         assert(!err, 'User is not created');
    //
    //         var userExists = function(email,id,cb) {
    //             query('SELECT * FROM UserData', function(err, res) {
    //                 cb(!err && res[id].email == email);
    //             });
    //         }

    //         // do multi row update
    //         UserData.update([
    //             {where:{id:'1'}, update:{ email:'userone@newname.com' }},
    //             {where:{id:'2'}, update:{ email:'usertwo@newname.com' }}]  , function(err, o) {
    //             assert.equal(err, null);

    //             // Verify user two email update
    //             userExists('userone@newname.com',0,function(yep) {
    //                     assert.ok(yep, 'Email of user one has changed');
    //             });
    //
    //             // Verify user two email update
    //             userExists('usertwo@newname.com',1,function(yep) {
    //                     assert.ok(yep, 'Email of user two has changed');
    //             });
    //
    //             UserData.create({email: 'userthreeemail@example.com',name:"ok",pendingPeriod:10, order: 5},function(e,o){
    //                 assert(!e, 'User is not created');
    //             });
    //             UserData.create({email: 'userfouremail@example.com',name:"ok",pendingPeriod:10, order: 7},function(e,o){
    //                 assert(!e, 'User is not created');
    //             });
    //             UserData.create({email: 'userfiveemail@example.com',name:"ok",pendingPeriod:5, order: 50},function(e,o){
    //                 assert(!e, 'User is not created');
    //             });
    //
    //             UserData.update([{where:{pendingPeriod:{gt:9}}, update:{ bio:'expired' }}], function(err, o) {
    //
    //                 // Verify that user 3 and 4's bio is expired
    //                 query('SELECT * FROM UserData where pendingPeriod > 9 ', function(err, res) {
    //                     assert.equal(res[1].bio, 'expired', 'When where greater conds bio expired');
    //                 });
    //
    //                 // Verify that user 5 's bio is still null
    //                 query('SELECT * FROM UserData where id=5', function(err, res) {
    //                     assert.equal(res[0].bio,null,"When where greater conds bio null");
    //                     done();
    //                 });
    //             });
    //         });
    //     });
    // });

    it('should check actuality of schema', done => {
        // 'drop column'
        UserData.schema.isActual((err, ok) => {
            assert.ok(ok, 'schema is not actual (should be)');
            UserData.defineProperty('essay', { type: Schema.Text });
            // UserData.defineProperty('email', false); Can't undefine currently.
            UserData.schema.isActual((err, ok) => {
                assert.ok(!ok, 'schema is actual (shouldn\t be)');
                done();
            });
        });
    });

    it('should allow numbers with decimals', done => {
        NumberData.create({ number: 1.1234567, tinyInt: 127, mediumInt: 0, floater: 99.99 }, (err, obj) => {
            assert.ok(!err);
            assert.ok(obj);
            NumberData.find(obj.id, (err, found) => {
                assert.equal(found.number, 1.123);
                assert.equal(found.tinyInt, 127);
                assert.equal(found.mediumInt, 0);
                assert.equal(found.floater, 99.99);
                done();
            });
        });
    });

    it('should allow both kinds of date columns', done => {
        DateData.create({
            dateTime: new Date('Aug 9 1996 07:47:33 GMT'),
            timestamp: new Date('Sep 22 2007 17:12:22 GMT')
        }, (err, obj) => {
            assert.ok(!err);
            assert.ok(obj);
            DateData.find(obj.id, (err, found) => {
                assert.equal(found.dateTime.toGMTString(), 'Fri, 09 Aug 1996 07:47:33 GMT');
                assert.equal(found.timestamp.toGMTString(), 'Sat, 22 Sep 2007 17:12:22 GMT');
                done();
            });
        });
    });

    it('should disconnect when done', done => {
        db.disconnect();
        done();
    });

    describe('autoupdate', () => {

        before(() => {
            db = getSchema();
        });

        after(() => db.disconnect());

        describe('drop columns', () => {

            it('should drop column when property removed from model', () => {
                const db = getSchema();
                db.define('Model', { a: String, b: String });

                return db.automigrate()
                    .then(() => {
                        const props = db.models['Model'].properties;
                        delete props.b;
                        return db.adapter.getAlterTableSQL('Model');
                    })
                    .then(sql => expect(sql[0]).toBe('DROP COLUMN `b`'));
            });

        });

        describe('drop indexes', () => {

            it('should drop single index when removed from property', () => {
                db.define('Model', { a: { type: String, index: true }, b: String });

                return db.automigrate()
                    .then(() => {
                        const props = db.models['Model'].properties;
                        delete props.a.index;
                        return db.adapter.getAlterTableSQL('Model');
                    })
                    .then(sql => {
                        expect(sql[0]).toBe('DROP INDEX `a`');
                        expect(sql.length).toBe(1);
                        return db.autoupdate();
                    });
            });

            it('should drop complex index when removed', () => {
                db.define('Model', { a: String, b: String }, {
                    indexes: {
                        ixAB: { keys: [ 'a', 'b' ] }
                    }
                });

                return db.automigrate()
                    .then(() => {
                        const indexes = db.models['Model'].settings.indexes;
                        delete indexes.ixAB;
                        return db.adapter.getAlterTableSQL('Model');
                    })
                    .then(sql => {
                        expect(sql[0]).toBe('DROP INDEX `ixAB`');
                        expect(sql.length).toBe(1);
                        return db.autoupdate();
                    });
            });

            it('should drop complex index when order changed', () => {
                db.define('Model', { a: String, b: String }, {
                    indexes: {
                        ixAB: { keys: [ 'b', 'a' ] }
                    }
                });

                return db.automigrate()
                    .then(() => {
                        const indexes = db.models['Model'].settings.indexes;
                        indexes.ixAB.keys = [ 'a', 'b' ];
                        return db.adapter.getAlterTableSQL('Model');
                    })
                    .then(sql => {
                        expect(sql.length).toBe(2);
                        expect(sql[0]).toBe('DROP INDEX `ixAB`');
                        expect(sql[1]).toBe('ADD  INDEX `ixAB`  (`a`, `b`)');
                        return db.autoupdate();
                    });
            });

            it('should drop complex index when keys changed', () => {
                db.define('Model', { a: String, b: String, c: String }, {
                    indexes: {
                        ixAB: { keys: [ 'a', 'b' ] }
                    }
                });

                return db.automigrate()
                    .then(() => {
                        const indexes = db.models['Model'].settings.indexes;
                        indexes.ixAB.keys = [ 'a', 'b', 'c' ];
                        return db.adapter.getAlterTableSQL('Model');
                    })
                    .then(sql => {
                        expect(sql.length).toBe(2);
                        expect(sql[0]).toBe('DROP INDEX `ixAB`');
                        expect(sql[1]).toBe('ADD  INDEX `ixAB`  (`a`, `b`, `c`)');
                        return db.autoupdate();
                    });
            });

        });

        describe('add indexes', () => {

            it('should add single index when index added to property', () => {
                db.define('Model', { a: String });

                return db.automigrate()
                    .then(() => {
                        const props = db.models['Model'].properties;
                        props.a.index = true;
                        return db.adapter.getAlterTableSQL('Model');
                    })
                    .then(sql => {
                        expect(sql[0]).toBe('ADD  INDEX `a`  (`a`)');
                        expect(sql.length).toBe(1);
                        return db.autoupdate();
                    });
            });

            it('should add single index with index_type setting', () => {
                db.define('Model', { a: String });

                return db.automigrate()
                    .then(() => {
                        const props = db.models['Model'].properties;
                        props.a.index = {
                            type: 'BTREE'
                        };
                        return db.adapter.getAlterTableSQL('Model');
                    })
                    .then(sql => {
                        expect(sql[0]).toBe('ADD  INDEX `a` USING BTREE (`a`)');
                        expect(sql.length).toBe(1);
                        return db.autoupdate();
                    });
            });

            it('should add unique/fulltext/spatial single index', () => {
                db.define('Model', { a: { type: String, length: 10 } });

                return db.automigrate()
                    .then(() => {
                        const props = db.models['Model'].properties;
                        props.a.index = {
                            kind: 'UNIQUE'
                        };
                        return db.adapter.getAlterTableSQL('Model');
                    })
                    .then(sql => {
                        expect(sql[0]).toBe('ADD UNIQUE INDEX `a`  (`a`)');
                        expect(sql.length).toBe(1);
                        return db.autoupdate();
                    });
            });

        });

        describe('change column', () => {

            it('should change type of integer column', () => {
                db.define('Model', { a: {
                    type: Number,
                    dataType: 'bigint',
                    unsigned: true
                } });

                return db.automigrate()
                    .then(() => {
                        const props = db.models['Model'].properties;
                        props.a.unsigned = false;
                        return db.adapter.getAlterTableSQL('Model');
                    })
                    .then(sql => {
                        expect(sql[0]).toBe('CHANGE COLUMN `a` `a` bigint(20) NULL');
                        expect(sql.length).toBe(1);
                        return db.autoupdate();
                    });
            });

            it('should change type of integer column', () => {
                db.define('Model', { a: {
                    type: Number,
                    dataType: 'bigint',
                    unsigned: true
                } });

                return db.automigrate()
                    .then(() => {
                        const props = db.models['Model'].properties;
                        props.a.unsigned = false;
                        return db.adapter.getAlterTableSQL('Model');
                    })
                    .then(sql => {
                        expect(sql[0]).toBe('CHANGE COLUMN `a` `a` bigint(20) NULL');
                        expect(sql.length).toBe(1);
                        return db.autoupdate();
                    });
            });

            describe('null', () => {

                it('should reflect null/not null setting (allowNull)', () => {
                    db.define('Model', { a: {
                        type: String,
                        allowNull: true
                    } });
                    const props = db.models['Model'].properties;
                    return db.automigrate()
                        .then(() => {
                            props.a.allowNull = false;
                            return db.adapter.getAlterTableSQL('Model');
                        })
                        .then(sql => {
                            expect(sql[0]).toBe('CHANGE COLUMN `a` `a` VARCHAR(255) NOT NULL');
                            return db.autoupdate();
                        })
                        .then(() => {
                            props.a.allowNull = true;
                            return db.adapter.getAlterTableSQL('Model');
                        })
                        .then(sql => {
                            expect(sql[0]).toBe('CHANGE COLUMN `a` `a` VARCHAR(255) NULL');
                        });
                });

                it('should reflect null/not null setting (null)', () => {
                    db.define('Model', { a: {
                        type: String,
                        null: true
                    } });
                    const props = db.models['Model'].properties;
                    return db.automigrate()
                        .then(() => {
                            props.a.null = false;
                            return db.adapter.getAlterTableSQL('Model');
                        })
                        .then(sql => {
                            expect(sql[0]).toBe('CHANGE COLUMN `a` `a` VARCHAR(255) NOT NULL');
                            return db.autoupdate();
                        })
                        .then(() => {
                            props.a.null = true;
                            return db.adapter.getAlterTableSQL('Model');
                        })
                        .then(sql => {
                            expect(sql[0]).toBe('CHANGE COLUMN `a` `a` VARCHAR(255) NULL');
                        });
                });

                it('defaults to allow null', () => {
                    db.define('Model', { a: {
                        type: String,
                        allowNull: false
                    } });
                    const props = db.models['Model'].properties;
                    return db.automigrate()
                        .then(() => {
                            delete props.a.allowNull;
                            return db.adapter.getAlterTableSQL('Model');
                        })
                        .then(sql => {
                            expect(sql[0]).toBe('CHANGE COLUMN `a` `a` VARCHAR(255) NULL');
                        });
                });

            });

        });

        context('not existing table', () => {

            it('should report "tableMissing"', () => {
                db.define('MissingTableName', { a: {
                    type: String,
                    allowNull: false
                } });
                return db.adapter.getTableInfo('MissingTableName')
                    .then(info => {
                        expect(info.tableMissing).toBe(true);
                    });
            });

        });

    });

});

function setup(done) {

    UserData = db.define('UserData', {
        email: { type: String, null: false, index: true, length: 100 },
        name: String,
        bio: Schema.Text,
        order : Number,
        birthDate: Date,
        pendingPeriod: Number,
        createdByAdmin: Boolean,
    } , { indexes: {
        index0: {
            columns: 'email, createdByAdmin'
        }
    } });

    db.define('StringData', {
        smallString: { type: String, null: false, index: true, dataType: 'char', limit: 127 },
        mediumString: { type: String, null: false,  dataType: 'varchar', limit: 255 },
        tinyText: { type: String, dataType: 'tinyText' },
        giantJSON: { type: Schema.JSON, dataType: 'longText' },
        text: { type: Schema.Text, dataType: 'varchar', limit: 1024 }
    });

    NumberData = db.define('NumberData', {
        number: { type: Number, null: false, index: true, unsigned: true, dataType: 'decimal', precision: 10, scale: 3 },
        tinyInt: { type: Number, dataType: 'tinyInt', display: 2 },
        mediumInt: { type: Number, dataType: 'mediumInt', unsigned: true },
        floater: { type: Number, dataType: 'double', precision: 14, scale: 6 }
    });

    DateData = db.define('DateData', {
        dateTime: { type: Date, dataType: 'datetime' },
        timestamp: { type: Date, dataType: 'timestamp' }
    });

    blankDatabase(db, () => {

        db.automigrate(err => {
            done(err);
        });

    });

}

const query = function(sql, cb) {
    db.adapter.query(sql)
        .then(r => cb(null, r), cb);
};

function blankDatabase(db, cb) {
    const dbn = db.settings.database;
    const cs = db.settings.charset;
    const co = db.settings.collation;

    query('DROP DATABASE IF EXISTS ' + dbn, err => {
        if (err) {
            return cb(err);
        }

        let q = 'CREATE DATABASE ' + dbn;

        if (cs) {
            q += ' CHARACTER SET ' + cs;
        }

        if (co) {
            q += ' COLLATE ' + co;
        }

        query(q, () => {
            query('USE ' + dbn, cb);
        });
    });
}

function getFields(model, cb) {
    query('SHOW FIELDS FROM ' + model, (err, res) => {
        if (err) {
            cb(err);
        } else {
            const fields = {};
            res.forEach(field => {
                fields[field.Field] = field;
            });
            cb(err, fields);
        }
    });
}

function getIndexes(model, cb) {
    query('SHOW INDEXES FROM ' + model, (err, res) => {
        if (err) {
            //console.log(err);
            cb(err);
        } else {
            const indexes = {};
            // Note: this will only show the first key of compound keys
            res.forEach(index => {
                if (parseInt(index.Seq_in_index, 10) === 1) {
                    indexes[index.Key_name] = index;
                }
            });
            cb(err, indexes);
        }
    });
}

