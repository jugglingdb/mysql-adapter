var should = require('./init.js');
var Schema = require('jugglingdb').Schema;
var db, UserData;
var assert = require('assert');

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

  it('should query collection with given attributes array, and return array Of Objects', function (done) {
    UserData.all({
      where : {
        or : [{
          order : 1
        }, {
          order : 5
        }]
      }, attributes: ['id']
    }, function (err, users) {
      should.exists(users);
      should.not.exists(err);
      users.should.have.lengthOf(2);
      users.should.be.instanceOf(Array);
      users.pop().should.be.instanceOf(Object).and.have.property('id');
      done();
    });
  });
  
  it('should query collection with given attributes array, and return array ids', function (done) {
    UserData.all({
      where : {
        or : [{
          order : 1
        }, {
          order : 5
        }]
      }, attributes: 'id'
    }, function (err, users) {
      should.exists(users);
      should.not.exists(err);
      users.should.have.lengthOf(2);
      users.should.be.instanceOf(Array);
      console.log(users);
      users.pop().should.be.a.Number;
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
          like : '%cCa%'
        }
      }
    }, function (err, users) {
      should.exists(users);
      should.not.exists(err);
      users.should.have.lengthOf(1);
      users[0].name.should.equal('Paul McCartney');
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

    it('should query by null', () => {
        return UserData.findOne({ where: { email: null }})
            .then(user => {
                should.not.exist(user.email);
            });
    });

    it('should support exclusion from empty set', () => {
        return UserData.count({ email: { nin: [] }})
            .then(count => {
                count.should.equal(6); // full set
            });
    });

    it('should support exclusion from non empty set', () => {
        return UserData.count({ order: { nin: [ 1 ] }})
            .then(count => {
                count.should.equal(5);
            });
    });

    it('should support inclusion in empty set', () => {
        return UserData.count({ email: { inq: [] }})
            .then(count => {
                count.should.equal(0); // empty set
            });
    });

    it('should query by "gt"', () => {
        return UserData.count({ order: { gt: 2 }})
            .then(count => {
                count.should.equal(4);
            });
    });

    it('should query by "gte"', () => {
        return UserData.count({ order: { gte: 2 }})
            .then(count => {
                count.should.equal(5);
            });
    });

    it('should query by "lt"', () => {
        return UserData.count({ order: { lt: 2 }})
            .then(count => {
                count.should.equal(1);
            });
    });

    it('should query by "lte"', () => {
        return UserData.count({ order: { lte: 2 }})
            .then(count => {
                count.should.equal(2);
            });
    });

    it.skip('should query by "ne"', () => {
        return UserData.count({ order: { ne: 2 }})
            .then(count => {
                count.should.equal(5);
            });
    });

    it.skip('should query by using "LIKE"', () => {
        return UserData.count({ email: { like: '%b3atl3s%' }})
            .then(count => {
                count.should.equal(2);
            });
    });

    it.skip('should query by using "NLIKE"', () => {
        return UserData.count({ email: { nlike: '%paul%' }})
            .then(count => {
                count.should.equal(1);
            });
    });

    it('should query by using "BETWEEN"', () => {
        return UserData.count({ order: { between: [ 3, 5 ] }})
            .then(count => {
                count.should.equal(3);
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
