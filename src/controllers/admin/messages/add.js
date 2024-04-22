const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const webSocketHelper = require('../../../helper/websocket')
const notificationHelper = require('../../../helper/notification')

// ========================================Create chat with client===================================================
exports.createChatWithClient = async (req, res) => {
    try {
      const autToken = req.headers[constant.authorization];
      const user_id = req.params.user_id;
      const {service_id, sub_service_id, user_service_id, dispute_id} = req.body;
  
      if(!autToken || autToken === "" || autToken === null) {
          return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
      }
  
      if(!service_id || service_id === "" || service_id === null ||
      !sub_service_id || sub_service_id === "" || sub_service_id === null ||
      !user_service_id || user_service_id === "" || user_service_id === null ||
      dispute_id === undefined) {
          return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
      }
  
      const authResult = await authHelper.verifyJWTToken(autToken);
  
      if(!authResult.status) {
          return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
      }
      
      const getExistingUser = await mysqlPool.queryWithValues('select * from user where id = ? and type = "client"', [user_id])
  
      if(getExistingUser.error || getExistingUser.result === undefined || getExistingUser.result.length === 0) {
        return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
      }
  
      const getExistingThread = await mysqlPool.queryWithValues('select * from thread where service_id = ? and sub_service_id = ? and user_service_id = ? and client_id = ? and admin_id = ?', [service_id, sub_service_id, user_service_id, user_id, authResult.id])

      if(!getExistingThread.error && getExistingThread.result && getExistingThread.result.length > 0) {
        return res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getExistingThread.result[0]));
      }
  
      const thread_id = util.getDBId()
      const queryValues = [thread_id, service_id, sub_service_id, user_service_id, dispute_id, user_id, '', authResult.id, util.currentTimestamp(), util.currentTimestamp()]
      const result = await mysqlPool.queryWithValues('INSERT INTO thread (id, service_id, sub_service_id, user_service_id, dispute_id, client_id, service_provider_id, admin_id, created_at, updated_at) VALUES (?)', [queryValues])
  
      if(result.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
    
      const getAddedThread = await mysqlPool.queryWithValues('select * from thread where id = ?', [thread_id])

      if(getAddedThread.error || getAddedThread.result === undefined || getAddedThread.result.length === 0) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }

      res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getAddedThread.result[0]));
    } catch {
      res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
  };
  

  // ========================================Create chat with service provider===================================================
exports.createChatWithServiceProvider = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const user_id = req.params.user_id;
    const {service_id, sub_service_id, user_service_id, dispute_id} = req.body;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    if(!service_id || service_id === "" || service_id === null ||
    !sub_service_id || sub_service_id === "" || sub_service_id === null ||
    !user_service_id || user_service_id === "" || user_service_id === null ||
    dispute_id === undefined) {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }
    
    const getExistingUser = await mysqlPool.queryWithValues('select * from user where id = ? and type = "service_provider"', [user_id])

    if(getExistingUser.error || getExistingUser.result === undefined || getExistingUser.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
    }

    const getExistingThread = await mysqlPool.queryWithValues('select * from thread where service_id = ? and sub_service_id = ? and user_service_id = ? and service_provider_id = ? and admin_id = ?', [service_id, sub_service_id, user_service_id, user_id, authResult.id])

    if(!getExistingThread.error && getExistingThread.result && getExistingThread.result.length > 0) {
      return res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getExistingThread.result[0]));
    }

    const thread_id = util.getDBId()
    const queryValues = [thread_id, service_id, sub_service_id, user_service_id, dispute_id, '', user_id, authResult.id, util.currentTimestamp(), util.currentTimestamp()]
    const result = await mysqlPool.queryWithValues('INSERT INTO thread (id, service_id, sub_service_id, user_service_id, dispute_id, client_id, service_provider_id, admin_id, created_at, updated_at) VALUES (?)', [queryValues])

    if(result.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
  
    const getAddedThread = await mysqlPool.queryWithValues('select * from thread where id = ?', [thread_id])

    if(getAddedThread.error || getAddedThread.result === undefined || getAddedThread.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getAddedThread.result[0]));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

  
// ========================================Send message===================================================
exports.sendMessage = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const thread_id = req.params.thread_id;
    const message = req.body.message;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    if(!message || message === "" || message === null) {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }
    
    const getExistingThread = await mysqlPool.queryWithValues('select * from thread where id = ? and admin_id = ?', [thread_id, authResult.id])

    if(getExistingThread.error || getExistingThread.result === undefined || getExistingThread.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidThreadId + thread_id, ""));
    }

    const threadDetail = getExistingThread.result[0];

    const messageId = util.getDBId()
    const queryValues = [messageId, thread_id, authResult.id, message, util.currentTimestamp(), util.currentTimestamp()]
    const result = await mysqlPool.queryWithValues('INSERT INTO message (id, thread_id, sender_user_id, message, created_at, updated_at) VALUES (?)', [queryValues])

    if(result.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const updateThreadUpdateTime = await mysqlPool.queryWithValues('update thread set updated_at = ? where id = ?', [util.currentTimestamp(), thread_id])

    if(updateThreadUpdateTime.error || updateThreadUpdateTime.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const getAddedMessageResult = await mysqlPool.queryWithValues('select * from message where id = ?', [messageId])

    if(getAddedMessageResult.error || getAddedMessageResult.result === undefined || getAddedMessageResult.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const getAddedMessage = getAddedMessageResult.result[0];

    const recevier_user_id = (threadDetail.service_provider_id ? threadDetail.service_provider_id : threadDetail.client_id)
    webSocketHelper.send(recevier_user_id, getAddedMessage)

    notificationHelper.sendNotificationForChatMessage(recevier_user_id, {
      service_id: threadDetail.service_id,
      sub_service_id: threadDetail.sub_service_id,
      user_service_id: threadDetail.user_service_id,
      thread_id: threadDetail.id,
      body: message
    })
    
    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Read message===================================================
exports.readMessage = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const thread_id = req.params.thread_id;
    const message_id = req.params.message_id;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }
    
    const getExistingThread = await mysqlPool.queryWithValues('select * from thread where id = ? and client_id = ?', [thread_id, authResult.id])

    if(getExistingThread.error || getExistingThread.result === undefined || getExistingThread.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidThreadId + thread_id, ""));
    }

    const getExistingMessage = await mysqlPool.queryWithValues('select * from message where id = ? and thread_id = ?', [message_id, thread_id])

    if(getExistingMessage.error || getExistingMessage.result === undefined || getExistingMessage.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidMessageId + message_id, ""));
    }
    
    const message = getExistingMessage.result[0];

    const result = await mysqlPool.queryWithValues('update message set is_read = 1, updated_at = ? where created_at <=  and thread_id = ?', [util.currentTimestamp(), message.created_at, thread_id])

    if(result.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
    
    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};
