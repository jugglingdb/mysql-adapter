var should = require('./init.js');
var assert = require('assert');
var Schema = require('jugglingdb').Schema;

var db, settings, adapter, DummyModel, odb;

describe('migrations', function() {
    
    before(function() {
        require('./init.js');
        
        odb = getSchema({collation: 'utf8mb4_general_ci'});
        db = odb;
    });
    
    
    it('should use utf8mb4 charset', function(done) {
        
        var test_set = /utf8mb4/;
        var test_collo = /utf8mb4_general_ci/;
        var test_set_str = 'utf8mb4';
        var test_set_collo = 'utf8mb4_general_ci';
        charsetTest(test_set, test_collo, test_set_str, test_set_collo, done);

    });
    
    it('should disconnect first db', function(done) {
        db.client.end(function(){
            odb = getSchema();
            done()
        });
    });
    
    it('should use latin1 charset', function(done) {
        
        var test_set = /latin1/;
        var test_collo = /latin1_general_ci/;
        var test_set_str = 'latin1';
        var test_set_collo = 'latin1_general_ci';
        charsetTest(test_set, test_collo, test_set_str, test_set_collo, done);
        
    });
    
    it('should drop db and disconnect all', function(done) {
        db.adapter.query('DROP DATABASE IF EXISTS ' + db.settings.database, function(err) {
            db.client.end(function(){
                done();
            });
        });
    });
});

describe('dropped connections', function() {

    before(function() {
        require('./init.js');
        db = getSchema();
    });

    it('should reconnect', function(done) {
        db.client.on('error', function(err) {
            if(err.code == 'PROTOCOL_CONNECTION_LOST') {
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


function charsetTest(test_set, test_collo, test_set_str, test_set_collo, done){
    
    query('DROP DATABASE IF EXISTS ' + odb.settings.database, function(err) {
        assert.ok(!err);
        odb.client.end(function(){ 
            
            db = getSchema({collation: test_set_collo});
            DummyModel = db.define('DummyModel', {string: String});
            db.automigrate(function(){
                var q = 'SELECT DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ' + db.client.escape(db.settings.database) + ' LIMIT 1';
                db.client.query(q, function(err, r) {
                    assert.ok(!err);
                    assert.ok(r[0].DEFAULT_COLLATION_NAME.match(test_collo));
                    db.client.query('SHOW VARIABLES LIKE "character_set%"', function(err, r){
                        assert.ok(!err);
                        var hit_all = 0;
                        for (var result in r) {
                            hit_all += matchResult(r[result], 'character_set_connection', test_set);
                            hit_all += matchResult(r[result], 'character_set_database', test_set);
                            hit_all += matchResult(r[result], 'character_set_results', test_set);
                            hit_all += matchResult(r[result], 'character_set_client', test_set);
                        }
                        assert.equal(hit_all, 4);
                    });
                    db.client.query('SHOW VARIABLES LIKE "collation%"', function(err, r){
                        assert.ok(!err);
                        var hit_all = 0;
                        for (var result in r) {
                            hit_all += matchResult(r[result], 'collation_connection', test_set);
                            hit_all += matchResult(r[result], 'collation_database', test_set);
                        }
                        assert.equal(hit_all, 2);
                        done();
                    });
                });
            });
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

var query = function (sql, cb) {
    odb.adapter.query(sql, cb);
};






