const mysqlPool = require('../config/mysqlpool');

module.exports = {
    query: function(query) {
        return new Promise(resolve => {
            mysqlPool.query(query, function (err, result, fields) {
                resolve({error:err, result:result});
            });
        });
    },
    queryWithValues: function(query, values) {
        return new Promise(resolve => {
            mysqlPool.query(query, values, function (err, result, fields) {
                resolve({error:err, result:result});
            });
        });
    }
};