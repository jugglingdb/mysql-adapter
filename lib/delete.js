'use strict';

module.exports = function(initializeSchema, db) {

    const tableName = initializeSchema.tableName;
    const command = db.command;

    return {
        destroy,
        destroyAll
    };

    function destroy(model, id) {
        const sql = `DELETE FROM ${ tableName(model) } WHERE \`id\` = ?`;

        return command(sql, [id]);
    }

    function destroyAll(model) {
        return command(`DELETE FROM ${ tableName(model) }`);
    }

};

