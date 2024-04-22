const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const notificationHelper = require('../../../helper/notification')

// ========================================Verify unverify user===================================================
exports.userVerifyUnverify = async (req, res) => {
    try {
      const autToken = req.headers[constant.authorization];
      const user_id = req.params.user_id;
      const VerifyUnverify = req.params.VerifyUnverify;
      const type = "service_provider"

      if(!autToken || autToken === "" || autToken === null) {
          return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
      }
  
      const authResult = await authHelper.verifyJWTToken(autToken);
  
      if(!authResult.status) {
          return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
      }
  
      const getExistingUser = await mysqlPool.queryWithValues('select * from user where id = ? and type = ?', [user_id, type])

      if(getExistingUser.error || getExistingUser.result === undefined || getExistingUser.result.length === 0) {
        return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
      }

      if(VerifyUnverify === "verify") {
        const verifyUserResult = await mysqlPool.queryWithValues('update user set is_verified = 1 where id = ? and type = ?', [user_id, type])

        if(verifyUserResult.error || verifyUserResult.result === undefined || verifyUserResult.result.length === 0) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }
      } else if(VerifyUnverify === "unverify") {
        const unverifyUserResult = await mysqlPool.queryWithValues('update user set is_verified = 0 where id = ? and type = ?', [user_id, type])

        if(unverifyUserResult.error || unverifyUserResult.result === undefined || unverifyUserResult.result.length === 0) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }
      } else {
        throw Error ('invlid type')
      }
     
      notificationHelper.sendNotificationForAccountVerification(VerifyUnverify === "verify", user_id, {
        service_id: "",
        sub_service_id: "",
        user_service_id: "",
        thread_id: ""
      })

      res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
    } catch {
      res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
  };


// ========================================Block unblock user===================================================
exports.userBlockUnblock = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const user_id = req.params.user_id;
    const type = req.params.type;
    const blockUnblock = req.params.blockUnblock;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExistingUser = await mysqlPool.queryWithValues('select * from user where id = ? and type = ?', [user_id, type])

    if(getExistingUser.error || getExistingUser.result === undefined || getExistingUser.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
    }

    if(blockUnblock === "block") {
      const blockUserResult = await mysqlPool.queryWithValues('update user set is_blocked = 1 where id = ? and type = ?', [user_id, type])

      if(blockUserResult.error || blockUserResult.result === undefined || blockUserResult.result.length === 0) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
    } else if(blockUnblock === "unblock") {
      const unblockUserResult = await mysqlPool.queryWithValues('update user set is_blocked = 0 where id = ? and type = ?', [user_id, type])

      if(unblockUserResult.error || unblockUserResult.result === undefined || unblockUserResult.result.length === 0) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
    } else {
      throw Error ('invlid type')
    }
   
    notificationHelper.sendNotificationForAccountBlock(blockUnblock === "block", user_id, {
      service_id: "",
      sub_service_id: "",
      user_service_id: "",
      thread_id: ""
    })

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};