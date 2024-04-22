const express = require('express')
const mysql  = require('mysql');
var cors = require('cors')
const webSocketHelper = require('./src/helper/websocket')
require('dotenv').config({path: __dirname + '/.env'})

//=============================== MYSQL connection =============================
var connection = mysql.createConnection({
    connectionLimit : 10,
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    debug: false,
    port:process.env.DATABASE_PORT
});

connection.connect((err) => {
    if (err) {
        console.log('Connection error message: ' + err.message);
        return;
    }
    console.log('Connected!')
});

//=============================== User APIs route =============================
const userRoute = require('./src/route/user')

const userApp = express()
userApp.use(express.json())
userApp.use(cors())
userApp.use(express.urlencoded({
    extended: true
}));

userApp.use('/v1/user', userRoute)

const USER_PORT=3304
const USER_WEBSOCKET_PORT=3303
userApp.listen(USER_PORT, () => {
    webSocketHelper.webSocketConnect(USER_WEBSOCKET_PORT, userApp)
    console.log(`Server listening on port ${USER_PORT} for user apis`)
})


//=============================== Admin APIs route =============================
const adminRoute = require('./src/route/admin')

const adminApp = express()
adminApp.use(express.json())
adminApp.use(cors())
adminApp.use(express.urlencoded({
    extended: true
}));

adminApp.use('/v1/admin', adminRoute)

const ADMIN_PORT=3307
const ADMIN_WEBSOCKET_PORT=3301
adminApp.listen(ADMIN_PORT, () => {
    webSocketHelper.webSocketConnect(ADMIN_WEBSOCKET_PORT, adminApp)
    console.log(`Server listening on port ${ADMIN_PORT} for admin apis`)
})

//=============================== Service Provider APIs route =============================
const serviceProviderRoute = require('./src/route/service_provider')

const serviceProvierApp = express()
serviceProvierApp.use(express.json())
serviceProvierApp.use(cors())
serviceProvierApp.use(express.urlencoded({
    extended: true
}));

serviceProvierApp.use('/v1/sp', serviceProviderRoute)

const SERVICE_PROVIDER_PORT=3305
const SERVICE_PROVIDER_WEBSOCKET_PORT=3302
serviceProvierApp.listen(SERVICE_PROVIDER_PORT, () => {
    webSocketHelper.webSocketConnect(SERVICE_PROVIDER_WEBSOCKET_PORT, serviceProvierApp)
    console.log(`Server listening on port ${SERVICE_PROVIDER_PORT} for service providers apis`)
})