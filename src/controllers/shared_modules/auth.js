const mysqlPool = require('../../helper/mysql')
const util = require('../../util/util')
const constant = require('../../util/constant')
const authHelper = require('../../helper/auth');

// ========================================Bind notification token===================================================
exports.bindNotificationToken = async (req, res) => {
    try {
      const autToken = req.headers[constant.authorization];
      const {fcm_token} = req.body;
  
      if(!autToken || autToken === "" || autToken === null) {
          return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
      }

      if(!fcm_token || fcm_token === "" || fcm_token === null) {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }
  
      const authResult = await authHelper.verifyJWTToken(autToken);
  
      if(!authResult.status) {
          return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
      }
  
      var updateUserDataQueryStr = 'update user_session set `fcm_token` = "' + fcm_token + '" where `id` = "' + authResult.session_id + '"';
  
      const resultUserDataUpdated = await mysqlPool.query(updateUserDataQueryStr);
      
      if(resultUserDataUpdated.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, resultUserDataUpdated));
      }
      
      res.status(constant.responseCodeSuccess).json(util.responseJSON(true, constant.responseMessageTokenBindSuccess, ""));
    } catch {
      res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
  };

// ========================================Refresh auth token===================================================
exports.refreshAuthToken = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authToken = await authHelper.verifyJWTToken(autToken)
    
    if(authToken.session_id === "") {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(true, constant.responseMessageTokenInvalid, ""));
    }

    const token = authHelper.getNewJWTToken(authToken.user_id, authToken.session_id)

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, constant.responseMessageTokenUpdate, token));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Logout===================================================
exports.logout = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    var updateUserDataQueryStr = 'update user_session set ``is_expired` = 1  where `id` = "' + authResult.session_id + '"';
  
    const resultUserDataUpdated = await mysqlPool.query(updateUserDataQueryStr);

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, constant.responseMessageLogoutSuccess, ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Delete Account===================================================
exports.delete = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const resultUserDisabled = await mysqlPool.queryWithValues('UPDATE user set `is_disabled` = 1 where id = ?', [authResult.id]);

    if(resultUserDisabled.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

exports.createNewSession = async (user_id) => {
    return new Promise(async resolve => {
      const session_id = util.getDBId();
      const token = authHelper.getNewJWTToken(user_id, session_id)
      const databaseValues = [session_id, user_id, '', token, util.currentTimestamp()];
      const resultSessionCreate = await mysqlPool.queryWithValues('INSERT INTO `user_session` (`id`, `user_id`, `fcm_token`, `auth_token`, `created_at`) VALUES (?)', [databaseValues]);
  
      if(resultSessionCreate.error) {
        return resolve({token: '', id: ''});
      }
      resolve({token: token, id: session_id});
    });
}