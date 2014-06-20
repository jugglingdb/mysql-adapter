var should = require('./init.js');
var Schema = require('jugglingdb').Schema;
var db, UserData;

describe('basic-query-mysql', function () {
    before(setup);
    before(function (done) {
        db = getSchema();
        UserData = db.define('UserData', {
          name : String,
          email : String,
          role : String,
          order : Number
      });

      db.automigrate(done);
    });

    before(seed);

    it('should query collection', function (done) {
        UserData.all(function (err, users) {
          users.should.have.lengthOf(6);
          done();
        });
    });

    it('should query collection where order is 1 or 5', function (done) {
        UserData.all({
          where : {
            or : [{
              order : 1
            }, {
              order : 5
            }]
          }
        }, function (err, users) {
          should.exists(users);
          should.not.exists(err);
          users.should.have.lengthOf(2);
          done();
        });
    });

    it('should query collection with given attribute array and return array of object literals', function (done) {
        UserData.all({
          where : {
            or : [{
              order : 1
            }, {
              order : 5
            }]
          }, attributes: ['id']
        }, function (err, ids) {
          should.exists(ids);
          should.not.exists(err);
          ids.should.have.lengthOf(2);
          ids.should.be.instanceOf(Array);
          ids[0].should.have.property('id');
          ids[0].should.be.instanceOf(Object);
          done();
        });
    });

    it('should query collection with given attribute and return array column data', function (done) {
        UserData.all({
          where : {
            or : [{
              order : 1
            }, {
              order : 5
            }]
          }, attributes: 'id'
        }, function (err, ids) {
          should.exists(ids);
          should.not.exists(err);
          ids.should.have.lengthOf(2);
          ids.should.be.instanceOf(Array);
          done();
        });
    });

    it('should error when incorrect attribute value given', function (done) {
        UserData.all({
          where : {
            or : [{
              order : 1
            }, {
              order : 5
            }]
          }, attributes: 7
        }, function (err, ids) {
          ids.should.be.null;
          should.exists(err);
          done();
        });
    });

    it('should retrun null object when array of attributes has incorrect Datatype', function (done) {
        UserData.all({
          where : {
            or : [{
              order : 1
            }, {
              order : 5
            }]
          }, attributes: [7,14]
        }, function (err, ids) {
          ids.should.be.null;
          should.not.exists(err);
          done();
        });
    });


    it('should query collection and return array of model instances', function (done) {
        UserData.all({
          where : {
            or : [{
              order : 1
            }, {
              order : 5
            }]
          }
        }, function (err, ids) {
          console.log(ids);
          should.exists(ids);
          should.not.exists(err);
          ids.should.have.lengthOf(2);
          ids.should.be.instanceOf(Array);
          ids[0].should.be.instanceOf(UserData);
          done();
        });
    });

    it('should count collection where order is 1 or 5', function (done) {
        UserData.count({
          or : [{
            order : 1
          }, {
            order : 5
          }]
        }, function (err, count) {
          should.not.exists(err);
          should.exists(count);
          count.should.eql(2);
          done();
        });
    });

    it('should query collection where name like Len', function (done) {
        UserData.all({
          where : {
            name : {
              like : '%Len%'
            }
          }
        }, function (err, users) {
          should.exists(users);
          should.not.exists(err);
          users.should.have.lengthOf(1);
          done();
        });
    });

    it('should query collection using or operator', function (done) {
        UserData.all({
          where : {
            or : [{
              name : 'Paul McCartney'
            }, {
              name : 'John Lennon'
            }]
          }
        }, function (err, users) {
          should.exists(users);
          should.not.exists(err);
          users.should.have.lengthOf(2);
          users.forEach(function (u) {
            u.role.should.eql('lead');
          });
          done();
        });
    });

    it('should query collection using or operator on different fields', function (done) {
        UserData.all({
          where : {
            or : [{
              name : 'Not a User'
            }, {
              order : '5'
            }]
          }
        }, function (err, users) {
          should.exists(users);
          should.not.exists(err);
          users.should.have.lengthOf(1);
          users[0].order.should.eql(5);
          done();
        });
    });

    it('should query collection using or operator combined with and operator', function (done) {
        UserData.all({
          where : {
            name : 'Ringo Starr',
            or : [{
              role : 'lead'
            }, {
              order : '6'
            }]
          }
        }, function (err, users) {
          should.exists(users);
          should.not.exists(err);
          users.should.have.lengthOf(1);
          users[0].name.should.equal('Ringo Starr');
          done();
        });
    });

    it('should query collection using IN operation', function (done) {
        UserData.all({
          where : {
            order : [ 4, 6 ]
          }
        }, function (err, users) {
          should.exists(users);
          should.not.exists(err);
          users.should.have.lengthOf(2);
          done();
        });
    });
});

  function seed(done) {
    var count = 0;
    var beatles = [{
      name : 'John Lennon',
      mail : 'john@b3atl3s.co.uk',
      role : 'lead',
      order : 2
    }, {
      name : 'Paul McCartney',
      mail : 'paul@b3atl3s.co.uk',
      role : 'lead',
      order : 1
    }, {
      name : 'George Harrison', order : 5
    }, {
      name : 'Ringo Starr', order : 6
    }, {
      name : 'Pete Best', order : 4
    }, {
      name : 'Stuart Sutcliffe', order : 3
    }];
    UserData.destroyAll(function () {
      beatles.forEach(function (beatle) {
        UserData.create(beatle, ok);
      });
    });
  
    function ok(err) {
      if (++count === beatles.length) {
        done();
      }
    }
}

    function setup(done) {
        require('./init.js');
        db = getSchema();
      
        blankDatabase(db, done);
    }
    
    var query = function (sql, cb) {
        db.adapter.query(sql, cb);
    };

    var blankDatabase = function (db, cb) {
        var dbn = db.settings.database;
        var cs = db.settings.charset;
        var co = db.settings.collation;
        query('DROP DATABASE IF EXISTS ' + dbn, function (err) {
          var q = 'CREATE DATABASE ' + dbn;
          if (cs) {
            q += ' CHARACTER SET ' + cs;
          }
          if (co) {
            q += ' COLLATE ' + co;
          }
          query(q, function (err) {
            query('USE ' + dbn, cb);
          });
        });
    };
