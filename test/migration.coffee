juggling = require('jugglingdb')
Schema = juggling.Schema
Text = Schema.Text

DBNAME = 'myapp_test'
DBUSER = ''
DBPASS = ''
DBENGINE = 'mysql'

schema = new Schema __dirname + '/..', database: '', username: DBUSER, password: DBPASS
schema.log = (q) -> console.log q

query = (sql, cb) ->
    schema.adapter.query sql, cb

User = schema.define 'User',
    email: { type: String, null: false, index: true }
    name: String
    bio: Text
    password: String
    birthDate: Date
    pendingPeriod: Number
    createdByAdmin: Boolean
,   indexes:
      index1:
        columns: 'email, createdByAdmin'
    table: 'user'

MySQLTypeTest = schema.define 'MySQLTypeTest',
    char_field: Schema.types.Char
    float_field: Schema.types.Float,
    int_field: Schema.types.Int,
    uint_field: Schema.types.Uint,
    small_int: Schema.types.SmallInt,
    small_uint: Schema.types.SmallUint,
    tiny_int: Schema.types.TinyInt,
    tiny_uint: Schema.types.TinyUint,
    enum_field: { type: Schema.types.Enum, choices: ['rock', 'paper', 'scissors'] },
    set_field: { type: Schema.types.Set, members: ['dog', 'cat', 'mouse'] },
    decimal_field: { type: Schema.types.Decimal, limit: [9,5] },
    
# If you don't have mysql version >= 5.6.x you can't have both Updated and Created in the same model.
MySQLCreated = schema.define 'MySQLCreated',
    text: String
    created_field: Schema.types.Created
    
MySQLUpdated = schema.define 'MySQLUpdated',
    text: String
    updated_field: Schema.types.Updated


withBlankDatabase = (cb) ->
    db = schema.settings.database = DBNAME
    query 'DROP DATABASE IF EXISTS ' + db, (err) ->
        query 'CREATE DATABASE ' + db, (err) ->
            query 'USE '+ db, cb

getFields = (model, cb) ->
    query 'SHOW FIELDS FROM ' + model, (err, res) ->
        if err
            cb err
        else
            fields = {}
            res.forEach (field) -> fields[field.Field] = field
            cb err, fields

getIndexes = (model, cb) ->
    query 'SHOW INDEXES FROM ' + model, (err, res) ->
        if err
            console.log err
            cb err
        else
            indexes = {}
            # Note: this will only show the first key of compound keys
            res.forEach (index) ->
              indexes[index.Key_name] = index if parseInt(index.Seq_in_index, 10) == 1
            cb err, indexes

it = (name, testCases) ->
  module.exports[name] = testCases

it 'should run migration', (test) ->
    withBlankDatabase (err) ->
        schema.automigrate ->
            getFields 'User', (err, fields) ->
                test.deepEqual fields,
                    id:
                        Field: 'id'
                        Type: 'int(10) unsigned'
                        Null: 'NO'
                        Key: 'PRI'
                        Default: null
                        Extra: 'auto_increment'
                    email:
                        Field: 'email'
                        Type: 'varchar(255)'
                        Null: 'NO'
                        Key: 'MUL'
                        Default: null
                        Extra: ''
                    name:
                        Field: 'name'
                        Type: 'varchar(255)'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: '' 
                    bio:
                        Field: 'bio'
                        Type: 'mediumtext'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    password:
                        Field: 'password'
                        Type: 'varchar(255)'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    birthDate:
                        Field: 'birthDate'
                        Type: 'datetime'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    pendingPeriod:
                        Field: 'pendingPeriod'
                        Type: 'float'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    createdByAdmin:
                        Field: 'createdByAdmin'
                        Type: 'tinyint(1) unsigned'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
            # Once gain, getIdexes truncates multi-key indexes to the first member. Hence index1 is correct.
            getIndexes 'User', (err, fields) ->
                test.deepEqual fields,
                    PRIMARY:
                        Table: 'User'
                        Non_unique: 0
                        Key_name: 'PRIMARY'
                        Seq_in_index: 1
                        Column_name: 'id'
                        Collation: 'A'
                        Cardinality: 0
                        Sub_part: null
                        Packed: null
                        Null: ''
                        Index_type: 'BTREE'
                        Comment: ''
                        Index_comment: ''
                    email:
                        Table: 'User'
                        Non_unique: 1
                        Key_name: 'email'
                        Seq_in_index: 1
                        Column_name: 'email'
                        Collation: 'A'
                        Cardinality: 0
                        Sub_part: null
                        Packed: null
                        Null: ''
                        Index_type: 'BTREE'
                        Comment: ''
                        Index_comment: ''
                    index1:
                        Table: 'User'
                        Non_unique: 1
                        Key_name: 'index1'
                        Seq_in_index: 1
                        Column_name: 'email'
                        Collation: 'A'
                        Cardinality: 0
                        Sub_part: null
                        Packed: null
                        Null: ''
                        Index_type: 'BTREE'
                        Comment: ''
                        Index_comment: ''
            # Check that additional MySQL specific field types get created.
            getFields 'MySQLTypeTest', (err, fields) ->
                test.deepEqual fields,
                    id: 
                        Field: 'id'
                        Type: 'int(10) unsigned'
                        Null: 'NO'
                        Key: 'PRI'
                        Default: null
                        Extra: 'auto_increment'
                    char_field: 
                        Field: 'char_field'
                        Type: 'char(255)'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    float_field: 
                        Field: 'float_field'
                        Type: 'float'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    int_field: 
                        Field: 'int_field'
                        Type: 'int(11)'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    uint_field: 
                        Field: 'uint_field'
                        Type: 'int(10) unsigned'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    small_int: 
                        Field: 'small_int'
                        Type: 'smallint(5)'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    small_uint: 
                        Field: 'small_uint'
                        Type: 'smallint(5) unsigned'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    tiny_int:
                        Field: 'tiny_int'
                        Type: 'tinyint(3)'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    tiny_uint: 
                        Field: 'tiny_uint'
                        Type: 'tinyint(3) unsigned'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    enum_field: 
                        Field: 'enum_field'
                        Type: 'enum(\'rock\',\'paper\',\'scissors\')'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    set_field: 
                        Field: 'set_field'
                        Type: 'set(\'dog\',\'cat\',\'mouse\')'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    decimal_field: 
                        Field: 'decimal_field'
                        Type: 'decimal(9,5)'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
            # updated and created are separate in case you aren't up to date on MySQL.
            getFields 'MySQLCreated', (err, fields) ->
                test.deepEqual fields,
                    id: 
                        Field: 'id'
                        Type: 'int(10) unsigned'
                        Null: 'NO'
                        Key: 'PRI'
                        Default: null
                        Extra: 'auto_increment'
                    text: 
                        Field: 'text'
                        Type: 'varchar(255)'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    created_field: 
                        Field: 'created_field'
                        Type: 'timestamp'
                        Null: 'NO'
                        Key: ''
                        Default: 'CURRENT_TIMESTAMP'
                        Extra: ''
            getFields 'MySQLUpdated', (err, fields) ->
                test.deepEqual fields,
                    id: 
                        Field: 'id'
                        Type: 'int(10) unsigned'
                        Null: 'NO'
                        Key: 'PRI'
                        Default: null
                        Extra: 'auto_increment'
                    text: 
                        Field: 'text'
                        Type: 'varchar(255)'
                        Null: 'YES'
                        Key: ''
                        Default: null
                        Extra: ''
                    updated_field:
                        Field: 'updated_field'
                        Type: 'timestamp'
                        Null: 'NO'
                        Key: ''
                        Default: 'CURRENT_TIMESTAMP'
                        Extra: 'on update CURRENT_TIMESTAMP'
                test.done()
                                
it 'should autoupgrade', (test) ->
    userExists = (cb) ->
        query 'SELECT * FROM User', (err, res) ->
            cb(not err and res[0].email == 'test@example.com')

    User.create email: 'test@example.com', (err, user) ->
        test.ok not err
        userExists (yep) ->
            test.ok yep
            User.defineProperty 'email', type: String
            User.defineProperty 'name', type: String, limit: 50
            User.defineProperty 'newProperty', type: Number
            User.defineProperty 'pendingPeriod', false
            schema.autoupdate (err) ->
                getFields 'User', (err, fields) ->
                    # change nullable for email
                    test.equal fields.email.Null, 'YES', 'Email is not null'
                    # change type of name
                    test.equal fields.name.Type, 'varchar(50)', 'Name is not varchar(50)'
                    # add new column
                    test.ok fields.newProperty, 'New column was not added'
                    if fields.newProperty
                        test.equal fields.newProperty.Type, 'float', 'New column type is not float'
                    # drop column
                    test.ok not fields.pendingPeriod, 'drop column'

                    # user still exists
                    userExists (yep) ->
                        test.ok yep
                        test.done()

it 'should check actuality of schema', (test) ->
    # drop column
    User.schema.isActual (err, ok, code) ->
        test.ok ok, 'schema is actual'
        User.defineProperty 'email', false
        User.schema.isActual (err, ok) ->
            test.ok not ok, 'schema is not actual'
            test.done()
            

it 'should add single-column index', (test) ->
    User.defineProperty 'email', type: String, index: { kind: 'FULLTEXT', type: 'HASH'}
    User.schema.autoupdate (err) ->
        return console.log(err) if err
        getIndexes 'User', (err, ixs) ->
            test.ok ixs.email && ixs.email.Column_name == 'email'
            test.equal ixs.email.Index_type, 'BTREE', 'default index type'
            test.done()

it 'should change type of single-column index', (test) ->
    User.defineProperty 'email', type: String, index: { type: 'BTREE' }
    User.schema.isActual (err, ok) ->
        test.ok ok, 'schema is actual'
        User.schema.autoupdate (err) ->
        return console.log(err) if err
        getIndexes 'User', (err, ixs) ->
            test.ok ixs.email && ixs.email.Column_name == 'email'
            test.equal ixs.email.Index_type, 'BTREE'
            test.done()

it 'should remove single-column index', (test) ->
    User.defineProperty 'email', type: String, index: false
    User.schema.autoupdate (err) ->
        return console.log(err) if err
        getIndexes 'User', (err, ixs) ->
            test.ok !ixs.email
            test.done()

it 'should update multi-column index when order of columns changed', (test) ->
    User.schema.adapter._models.User.settings.indexes.index1.columns = 'createdByAdmin, email'
    User.schema.isActual (err, ok) ->
        test.ok not ok, 'schema is not actual'
        User.schema.autoupdate (err) ->
            return console.log(err) if err
            getIndexes 'User', (err, ixs) ->
                test.equals ixs.index1.Column_name, 'createdByAdmin'
                test.done()

it 'test', (test) ->
    User.defineProperty 'email', type: String, index: true
    User.schema.autoupdate (err) ->
        User.schema.autoupdate (err) ->
            User.schema.autoupdate (err) ->
                test.done()

it 'should have sane sets and enums', (test) ->
    MySQLTypeTest.create
        enum_field: 'rock'
        set_field: 'dog,cat'
        tiny_int: 3
        small_int: 50
        char_field: 'chars',
        (err, obj) ->
            test.ok (obj.enum_field == 'rock'), 'Save failed'
            test.ok (obj.tiny_int == 3), 'Save failed'
            test.ok (obj.id > 0), 'Save failed'
            MySQLTypeTest.findOne {id: obj.id}, (err, obj) ->
                test.ok (obj.id > 0), 'Retrieval failed.'
                test.ok (obj.tiny_int == 3), 'TinyInt not stored'
                test.ok (obj.char_field == 'chars'), 'Char field not stored'
                test.ok (obj.enum_field == 'rock'), 'Enum not stored'
                test.ok (obj.set_field == 'dog,cat'), 'Set not stored'
                obj.set_field = 'cat,mouse,owl'
                # Side note: owl not in schema. 
                # It will still save, but not with the owl.
                obj.save (err, obj) ->
                    # Since save succeeded, value out of sync.
                    MySQLTypeTest.findOne {id: obj.id}, (err, obj) ->
                        test.ok (obj.set_field == 'cat,mouse'), 'Not expected behavior'
                        test.done()

it 'should have automatic dates', (test) ->
    # When DB changes the value, it's not propogated to model unless refreshed.
    # Time has minimum SQL res of 1 sec, so we have to wait.
    MySQLCreated.create {text: 'c_message_1'}, (err,obj) ->
        MySQLCreated.findOne {id: obj.id}, (err,obj) ->
            otext = obj.text
            ocreate = obj.created_field
            setTimeout(()->
                obj.updateAttributes {text : 'c_message_2'}, (err, new_obj) ->
                    MySQLCreated.findOne {id: new_obj.id}, (err, ret_obj) ->
                        test.ok (otext != ret_obj.text)
                        test.ok (ocreate.toString() == ret_obj.created_field.toString()), "Created date has changed"
            , 1000)
    MySQLUpdated.create {text: 'u_message_1'}, (err,obj) ->
        MySQLUpdated.findOne {id: obj.id}, (err,obj) ->
            otext = obj.text
            oupdate = obj.updated_field
            setTimeout(()->
                obj.updateAttributes {text: 'u_message_2'}, (err, new_obj) ->
                    MySQLUpdated.findOne {id: new_obj.id}, (err, ret_obj) ->
                        test.ok (otext != ret_obj.text)
                        test.ok (oupdate.toString() != ret_obj.updated_field.toString()), "Updated date has not changed"
                        test.done()
            , 1000)
    

it 'should disconnect when done', (test) ->
    schema.disconnect()
    test.done()

