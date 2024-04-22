const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')


// ========================================Edit sub admin===================================================
exports.edit = async (req, res) => {
  try {
    const {name, email, password, privileges} = req.body;
    const user_id = req.params.user_id;

    var updateUserDataQueryStr = 'update user set'
    var isUpdatingUserData = false

    if(name && name != "" && name != null) {
        updateUserDataQueryStr = updateUserDataQueryStr + ' `first_name` = "' + name + '",'
        isUpdatingUserData = true
    }

    if(password && password != "" && password != null) {
      const hasPassword = await authHelper.cryptPassword(password);
        
      if(hasPassword === "") {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageInvalidPasswordFormat, ""));
      }
      
      updateUserDataQueryStr = updateUserDataQueryStr + ' `password` = "' + password + '",'
      isUpdatingUserData = true
    }

    if(email && email != "" && email != null) {
        updateUserDataQueryStr = updateUserDataQueryStr + ' `email` = "' + email + '",'
        isUpdatingUserData = true
    }

    if(privileges && privileges.length > 0) {
      updateUserDataQueryStr = updateUserDataQueryStr + ' `privileges` = "' + privileges.join(',') + '",'
      isUpdatingUserData = true
  }

    if(isUpdatingUserData) {
        updateUserDataQueryStr = updateUserDataQueryStr + ' `updated_at` = "' + util.currentTimestamp() + '" where `id` = "' + user_id + '"';

        const resultUserDataUpdated = await mysqlPool.query(updateUserDataQueryStr);
    
        if(resultUserDataUpdated.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }
    }

    const resultUserByEmail = await mysqlPool.queryWithValues('select * from user where email = ?', [email])

    if(resultUserByEmail.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var userData = resultUserByEmail.result[0]
   
    delete userData.password;
    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", userData));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Delete sub admin===================================================
exports.delete = async (req, res) => {
  try {
    const user_id = req.params.user_id;

    if(!user_id || user_id === "" || user_id === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    const resultUserAdded = await mysqlPool.queryWithValues('UPDATE user set `is_disabled` = 1 where id = ?', [user_id]);

    if(resultUserAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};