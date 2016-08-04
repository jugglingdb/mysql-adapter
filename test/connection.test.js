const should = require('./init.js');
const assert = require('assert');

let db;

/* global getSchema */

describe('migrations', () => {

    before(() => {
        db = getSchema({ collation: 'utf8mb4_general_ci' });
    });

    it('should use utf8mb4 charset', done => {
        const charset = /utf8mb4/;
        const collo = /utf8mb4_general_ci/;
        const str = 'utf8mb4';
        const collation = 'utf8mb4_general_ci';
        charsetTest(charset, collo, str, collation, done);
    });

    it('should disconnect first db', done => {
        db.client.end(() => {
            db = getSchema();
            done();
        });
    });

    it('should use latin1 charset', done => {

        const charset = /latin1/;
        const collo = /latin1_general_ci/;
        const str = 'latin1';
        const collation = 'latin1_general_ci';
        charsetTest(charset, collo, str, collation, done);

    });

    it('should drop db and disconnect all', () => {
        return db.adapter.recreateDatabase()
            .then(() => db.adapter.closeConnection());
    });

});

describe.skip('dropped connections', () => {

    before(() => {
        db = getSchema();
    });

    it('should reconnect', done => {
        db.client.on('error', err => {
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                db.connect(() => {
                    done();
                });
                return;
            }
            throw err;
        });

        // Simulate a disconnect in socket
        db.client._socket.on('timeout', () => {
            db.client._socket.emit('error', {
                message: 'Test error',
                stack: '',
                code: 'PROTOCOL_CONNECTION_LOST'
            });
        });

        db.client._socket.setTimeout(100);
    });

    it('should use the new connection', done => {
        db.adapter.query('SHOW TABLES', err => {
            should.not.exist(err);
            done();
        });
    });
});


function charsetTest(charset, collo, str, collation, done) {
    return db.adapter.closeConnection()
        .then(() => {
            db = getSchema({ collation });
            db.define('DummyModel', { string: String });
            db.automigrate(() => {
                const sql = 'SELECT DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1';
                db.adapter.command(sql, [db.settings.database])
                    .then(response => {
                        const r = response.result;
                        assert.ok(r[0].DEFAULT_COLLATION_NAME.match(collo));
                        return db.adapter.query('SHOW VARIABLES LIKE "character_set%"');
                    })
                    .then(r => {
                        let hitAll = 0;
                        Object.keys(r).forEach(key => {
                            const result = r[key];
                            hitAll += matchResult(r[result], 'character_set_connection', charset);
                            hitAll += matchResult(r[result], 'character_set_database', charset);
                            hitAll += matchResult(r[result], 'character_set_results', charset);
                            hitAll += matchResult(r[result], 'character_set_client', charset);
                        });
                        assert.equal(hitAll, 4);
                        return db.adapter.query('SHOW VARIABLES LIKE "collation%"');
                    })
                    .then(r => {
                        let hitAll = 0;
                        Object.keys(r).forEach(key => {
                            const result = r[key];
                            hitAll += matchResult(r[result], 'collation_connection', charset);
                            hitAll += matchResult(r[result], 'collation_database', charset);
                        });
                        assert.equal(hitAll, 2);
                        done();
                    })
                    .catch(done);
            });
        });
}

function matchResult(result, varName, match) {
    if (result.Variable_name === varName) {
        assert.ok(result.Value.match(match));
        return 1;
    }
    return 0;
}

