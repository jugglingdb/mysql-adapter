## JugglingDB-MySQL [![Build Status](https://travis-ci.org/jugglingdb/mysql-adapter.png)](https://travis-ci.org/jugglingdb/mysql-adapter)

MySQL adapter for JugglingDB.

## Usage

To use it you need `jugglingdb@0.2.x`.

1. Setup dependencies in `package.json`:

    ```json
    {
      ...
      "dependencies": {
        "jugglingdb": "0.2.x",
        "jugglingdb-mysql": "latest"
      },
      ...
    }
    ```

2. Use:

    ```javascript
    var Schema = require('jugglingdb').Schema;
    var schema = new Schema('mysql', {
        database: 'myapp_test',
        username: 'root'
    });
    ```
    You can optionally pass a few additional parameters supported by `node-mysql`, most particularly `password` and `collation`. `Collation` currently defaults to `utf8mb4_general_ci`. The `collation` value will also be used to derive the connection charset.

## Running tests

    npm test
    
## Using the `dataType` field/column option with MySQL

The jugglingdb MySQL adapter now supports using the `dataType`  column/property attribute to specify what MySQL column type is used for many jugglingdb types.

The following type-dataType combinations are supported:
* <h4> Number </h4>
  * <h5> integer </h5>
     * tinyint
     * smallint
     * mediumint
     * int
     * bigint
     
     Use the `limit` option to alter the display width.

     Example:
      `{ count : { type: Number, dataType: 'smallInt' }}`

  * <h5> floating point types </h5>
     * float
     * double
     
     Use the `precision` and `scale` options to specify custom precision. Default is (16,8).

     Example:
      `{ average : { type: Number, dataType: 'float', precision: 20, scale: 4 }}`

  * <h5> fixed-point exact value types </h5>
     * decimal
     * numeric

     Use the `precision` and `scale` options to specify custom precision. Default is (9,2).
     
     These aren't likely to function as true fixed-point.
     
     Example:
      `{ stdDev : { type: Number, dataType: 'decimal', precision: 12, scale: 8 }}`

* <h4> String / Schema.Text / Schema.JSON </h4>
  * varchar
  * char
  * text
  * mediumtext
  * tinytext
  * longtext
  
  Example:
   `{ userName : { type: String, dataType: 'char', limit: 24 }}`

  Example:
   `{ biography : { type: String, dataType: 'longtext' }}`

* <h4> Date </h4>
  * datetime
  * timestamp
  
  Example:
   `{ startTime : { type: Date, dataType: 'timestamp' }}`

* <h4> Enum </h4>
  Enums are special.
  Create an Enum using Enum factory:
  
  ```javascript
  var MOOD = schema.EnumFactory('glad', 'sad', 'mad');
  MOOD.SAD;    // 'sad'
  MOOD(2);     // 'sad'
  MOOD('SAD'); // 'sad'
  MOOD('sad'); // 'sad'
  ```
  
  * `{ mood: { type: MOOD }}`
  * `{ choice: { type: schema.EnumFactory('yes', 'no', 'maybe'), null: false }}`

## Using OR and IN operator

### OR
Mysql adapter now supports the or functionality. You can add an `or` array object to the where clause to join the arguments in the `or` array with an OR.
    
Example:
This example selects all the animals whose name are Penny AND type is either cat OR size is medium

```javascript
where : {
    name : 'Penny',
    or : [ { type : 'cat'},
           { size : 'medium'}
    ]
}
```

It's important to note that each object in the `or` array is treat as if it was in the "where" clause, thus you can create complex queries like this;

Example:
The example below selects all large white dogs OR all cats who are either small or black color

```javascript
where : {
    or : [ { type : 'dog', color : 'white', size : 'large'},
           { type : 'cat', or : [ { size : 'small'},
                                  { color : 'black'}
                                ]
           }
    ]
}
```

SQL translation for the above would be:

```sql
WHERE (type = 'dog' AND color = 'white' AND size = 'large')
   OR (type = 'cat' AND (size = 'small' OR color = 'black'))
```

### IN

IN operator is pretty straight forward. If you give any columns in the where clause an array, they will be interpreted to be an IN object

Example:
The example below will look for items that have id 1, 4 or 6

```javascript
where : {
    id : [1,4,6]
}
```

## Connection Pooling
Mysql adapter uses the pooling provided by the node-mysql module. Simply set `pool` option to true in the connection settings.

### Pool Options
Taken from node-mysql module

* `waitForConnections`: Determines the pool's action when no connections are available and the limit has been reached. If `true`, the pool will queue the connection request and call it when one becomes available. If `false`, the pool will immediately call back with an error. (Default: `true`)
* `connectionLimit`: The maximum number of connections to create at once.(Default: `10`)
* `queueLimit`: The maximum number of connection requests the pool will queue before returning an error from `getConnection`. If set to `0`, there is no limit to the number of queued connection requests. (Default: `0`)

## Creating Multi-Column Indexes
The mysql adapter supports the declaration of multi-column indexes on models via the the `indexes` option in the 3rd argument to `define`. 

```javascript
UserData = db.define('UserData', {
        email: { type: String, null: false, index: true },
        name: String,
        bio: Schema.Text,
        birthDate: Date,
        pendingPeriod: Number,
        createdByAdmin: Boolean,
    } , { indexes: {
            index0: {
                columns: 'email, createdByAdmin'
            }
        }
    });
```

## MIT License

```text
Copyright (C) 2012 by Anatoliy Chakkaev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
