const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')


// ========================================Create new sub admin===================================================
exports.add = async (req, res) => {
  try {
    const {name, email, password, privileges} = req.body;

    if(!name || name === "" || name === null || 
    !email || email === "" || email === null || 
    !password || password === "" || password === null ||
    !privileges || privileges.length === 0 || privileges === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

      const resultUserByPhone = await mysqlPool.queryWithValues('select * from user where email = ? and type = "sub_admin"', [email])

      if(resultUserByPhone.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }

      if(resultUserByPhone.result.length === 0) {
        //need to create new user and new session

        const user_id = util.getDBId();
        const hasPassword = await authHelper.cryptPassword(password);
        
        if(hasPassword === "") {
          return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageInvalidPasswordFormat, ""));
        }

        const databaseValues = [user_id, '', 'sub_admin', name, '', email, hasPassword, 1, 0, 0, 0, '', privileges.join(','), util.currentTimestamp(), util.currentTimestamp()];
        const resultUserAdded = await mysqlPool.queryWithValues('INSERT INTO user (`id`, `phone`,`type`,`first_name`,`last_name`,`email`,`password`,`is_verified`,`avg_rating`,`is_blocked`,`is_disabled`,`razorpay_user_id`,`privileges`,`created_at`,`updated_at`) VALUES (?)', [databaseValues]);

        if(resultUserAdded.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }

        const resultUserByPhone = await mysqlPool.queryWithValues('select * from user where email = ?', [email])

        if(resultUserByPhone.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }

        var userData = resultUserByPhone.result[0]
       
        delete userData.password;
        res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", userData));

      } else {
        res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageEmailAlreadyRegistered, ""));
      }
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};