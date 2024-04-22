const WebSocket = require('ws')
const http = require('http')
const constant = require('../util/constant')
const authHelper = require('../helper/auth')

var connections = {};

module.exports = {
   webSocketConnect:(port, app) => {

        const server = http.createServer(app)

        server.listen(port, function () {
            console.log('Server running ws on port:', port)
        })

        const wss = new WebSocket.Server({server});

        wss.on('connection', async function (ws, req) {
            var authToken = req.headers[constant.authorization]

            if(!authToken) {
              var tokenMask = req.url.replace('/','')
              const result = await authHelper.getTokenFromMask(tokenMask)

              if(result.status) {
                authToken = result.token
              }
            }

            if(!authToken) {
              ws.close()
              return
            }

            const authResult = await authHelper.verifyJWTToken(authToken)

            if(!authResult.status) {
              ws.close()
              return
            }

            connections[authResult.id] = ws;
        })
      },
      
      send: (user_id, body) => {
        const wsConnection = connections[user_id];
        if(wsConnection != undefined && wsConnection != null) {
            wsConnection.send(JSON.stringify(body))
        }
      }
};