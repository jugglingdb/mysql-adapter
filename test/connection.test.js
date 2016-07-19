const should = require('./init.js');
const assert = require('assert');

let db, DummyModel;

/* global getSchema */

describe('migrations', function() {
    
    before(function() {
        db = getSchema({collation: 'utf8mb4_general_ci'});
    });

    it('should use utf8mb4 charset', function(done) {
        var test_set = /utf8mb4/;
        var test_collo = /utf8mb4_general_ci/;
        var test_set_str = 'utf8mb4';
        var collation = 'utf8mb4_general_ci';
        charsetTest(test_set, test_collo, test_set_str, collation, done);
    });

    it('should disconnect first db', function(done) {
        db.client.end(function(){
            db = getSchema();
            done();
        });
    });

    it('should use latin1 charset', function(done) {

        var test_set = /latin1/;
        var test_collo = /latin1_general_ci/;
        var test_set_str = 'latin1';
        var collation = 'latin1_general_ci';
        charsetTest(test_set, test_collo, test_set_str, collation, done);

    });
    
    it('should drop db and disconnect all', function() {
        return db.adapter.recreateDatabase()
            .then(() => db.adapter.closeConnection());
    });

});

describe.skip('dropped connections', function() {

    before(function() {
        db = getSchema();
    });

    it('should reconnect', function(done) {
        db.client.on('error', function(err) {
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                db.connect(function() {
                    done();
                });
                return;
            }
            throw err;
        });

        // Simulate a disconnect in socket
        db.client._socket.on('timeout', function() {
            db.client._socket.emit('error', {
                message: 'Test error',
                stack: '',
                code: 'PROTOCOL_CONNECTION_LOST'
            });
        });

        db.client._socket.setTimeout(100);
    });

    it('should use the new connection', function(done) {
        db.adapter.query('SHOW TABLES', function(err) {
            should.not.exist(err);
            done();
        });
    });
});


function charsetTest(test_set, test_collo, test_set_str, collation, done) {
    return db.adapter.closeConnection()
        .then(() => {
            db = getSchema({collation: collation});
            DummyModel = db.define('DummyModel', {string: String});
            db.automigrate(function() {
                const sql = 'SELECT DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1';
                db.adapter.command(sql, [ db.settings.database ])
                    .then(response => {
                        const r = response.result;
                        assert.ok(r[0].DEFAULT_COLLATION_NAME.match(test_collo));
                        return db.adapter.query('SHOW VARIABLES LIKE "character_set%"');
                    })
                    .then(r => {
                        let hitAll = 0;
                        for (let result in r) {
                            hitAll += matchResult(r[result], 'character_set_connection', test_set);
                            hitAll += matchResult(r[result], 'character_set_database', test_set);
                            hitAll += matchResult(r[result], 'character_set_results', test_set);
                            hitAll += matchResult(r[result], 'character_set_client', test_set);
                        }
                        assert.equal(hitAll, 4);
                        return db.adapter.query('SHOW VARIABLES LIKE "collation%"');
                    })
                    .then(r => {
                        let hitAll = 0;
                        for (let result in r) {
                            hitAll += matchResult(r[result], 'collation_connection', test_set);
                            hitAll += matchResult(r[result], 'collation_database', test_set);
                        }
                        assert.equal(hitAll, 2);
                        done();
                    })
                    .catch(done);
            });
        });
}

function matchResult(result, variable_name, match) {
    if(result.Variable_name == variable_name){
        assert.ok(result.Value.match(match));
        return 1;
    }
    return 0;
}

