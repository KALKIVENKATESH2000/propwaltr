const mysql = require('mysql')

const isLiveEnv = true;
var configJSON = {};

if(isLiveEnv === true) {
    configJSON = {
        connectionLimit:1000,
        host: "propwalt.cdcqbzrqafbc.ap-south-1.rds.amazonaws.com",
        user: "admin",
        password: "CP1FYw8rDYgI0YBcWVGH",
        database: "propwalt",
        port:3306,
        debug:false,
        charset: 'utf8mb4'
    };
} else {
    configJSON = {
        host: "localhost",
        user: "root",
        password: "Root@321",
        database: "propwalt",
        port:3306,
        charset: 'utf8mb4'
    };
}

const pool = mysql.createPool(configJSON);

module.exports = pool;