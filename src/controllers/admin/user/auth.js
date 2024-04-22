const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const sharedModule = require('../../../controllers/shared_modules/auth')
const authHelper = require('../../../helper/auth')
const awsHelper = require('../../../helper/aws')
const emailHelper = require('../../../helper/email')

// ========================================Signup User===================================================
exports.singup = async (req, res) => {
  try {
    const {email, password} = req.body;

    if(!email || email === "" || email === null || !password || password === "" || password === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

      const resultUserByPhone = await mysqlPool.queryWithValues('select * from user where email = ? and type = "admin"', [email])

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

        const databaseValues = [user_id, '', 'admin', '', '', email, hasPassword, 1, 0, 0, 0, '', '', util.currentTimestamp(), util.currentTimestamp()];
        const resultUserAdded = await mysqlPool.queryWithValues('INSERT INTO user (`id`, `phone`,`type`,`first_name`,`last_name`,`email`,`password`,`is_verified`,`avg_rating`,`is_blocked`,`is_disabled`,`razorpay_user_id`,`privileges`,`created_at`,`updated_at`) VALUES (?)', [databaseValues]);

        if(resultUserAdded.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }

        const resultUserByPhone = await mysqlPool.queryWithValues('select * from user where email = ?', [email])

        if(resultUserByPhone.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }

        var userData = resultUserByPhone.result[0]
        const authToken = await sharedModule.createNewSession(userData.id);
       
        if(authToken === "") {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }

        userData.token = authToken.token;
        userData.ws_key = authToken.id;
        userData.privileges = userData.privileges.split(',')

        delete userData.password;
        res.status(constant.responseCodeSuccess).json(util.responseJSON(true, constant.responseMessageOTPVerified, userData));

      } else {
        res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageEmailAlreadyRegistered, ""));
      }
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Login User===================================================
exports.login = async (req, res) => {
  try {
    const {email, password} = req.body;

    if(!email || email === "" || email === null || !password || password === "" || password === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

      const resultUserByPhone = await mysqlPool.queryWithValues('select * from user where email = ? and (type = "admin" or type = "sub_admin")', [email])

      if(resultUserByPhone.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }

      if(resultUserByPhone.result.length === 0 || resultUserByPhone.error) {
        res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageEmailNotRegistered, ""));
      } else {
        var userData = resultUserByPhone.result[0]
        const isPasswordMatch = await authHelper.comparePassword(password, userData.password)
        
        if(isPasswordMatch) {
          const authToken = await sharedModule.createNewSession(userData.id);
       
          if(authToken === "") {
            return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
          }

          userData.token = authToken.token;
          userData.ws_key = authToken.id;
          userData.privileges = userData.privileges.split(',')
          delete userData.password;

          res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", userData));
        } else {
          res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessagePasswordInvalid, ""));
        }
      }
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Forgot password===================================================
exports.forgotPassword = async (req, res) => {
  try {
    const {email} = req.body;

    if(!email || email === "" || email === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    const resultUserByPhone = await mysqlPool.queryWithValues('select * from user where email = ? and (type = "admin" or type = "sub_admin")', [email])

    if(resultUserByPhone.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    if(resultUserByPhone.result.length === 0 || resultUserByPhone.error) {
      res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageEmailNotRegistered, ""));
    } else {
      const userData = resultUserByPhone.result[0]
      const authTokenForForgotPassword = authHelper.getNewJWTTokenForForgotPassword(userData.id)
      await emailHelper.resetPasswordEmail((userData.first_name + " " + userData.last_name).trim(), userData.email, authTokenForForgotPassword)
      res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
    }
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Forgot password===================================================
exports.forgotPasswordVerifyAndChangePassword = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const {password} = req.body;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    if(!password || password === "" || password === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    const authResult = await authHelper.verifyJWTTokenForForgotPassword(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const resultUserByPhone = await mysqlPool.queryWithValues('select * from user where id = ? and type = "admin" or type = "sub_admin"', [authResult.id])

    if(resultUserByPhone.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    if(resultUserByPhone.result.length === 0 || resultUserByPhone.error) {
      res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
    } else {
      const hasPassword = await authHelper.cryptPassword(password);
        
      if(hasPassword === "") {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageInvalidPasswordFormat, ""));
      }

      const resultPasswordChanged = await mysqlPool.queryWithValues('update user set password = "' + hasPassword + '" where id = ?', [authResult.id])

      if(resultPasswordChanged.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }

      res.status(constant.responseCodeSuccess).json(util.responseJSON(true, constant.responseMessagePasswordChanged, ""));
    }
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Change password===================================================
exports.changePassword = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const {old_password, password} = req.body;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    if(!old_password || old_password === "" || old_password === null ||
    !password || password === "" || password === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const resultUserByPhone = await mysqlPool.queryWithValues('select * from user where id = ? and (type = "admin" or type = "sub_admin")', [authResult.id])

    if(resultUserByPhone.result.length === 0 || resultUserByPhone.error) {
      res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
    } else {
      const oldPasswordMathed = await authHelper.comparePassword(old_password, resultUserByPhone.result[0].password)
      
      if(!oldPasswordMathed) {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageOldPasswordInvalid, ""));
      }

      const newPasswordMathed = await authHelper.comparePassword(password, resultUserByPhone.result[0].password)

      if(newPasswordMathed) {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageSamePassword, ""));
      }

      const hasPassword = await authHelper.cryptPassword(password);
        
      if(hasPassword === "") {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageInvalidPasswordFormat, ""));
      }

      const resultPasswordChanged = await mysqlPool.queryWithValues('update user set password = "' + hasPassword + '" where id = ?', [authResult.id])

      if(resultPasswordChanged.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }

      res.status(constant.responseCodeSuccess).json(util.responseJSON(true, constant.responseMessagePasswordChanged, ""));
    }
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Update user===================================================
exports.updateUser = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const {name, email, phone} = req.body;
    const file = req.file;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    var updateUserDataQueryStr = 'update user set'
    var isUpdatingUserData = false

    if(name && name != "" && name != null) {
        updateUserDataQueryStr = updateUserDataQueryStr + ' `first_name` = "' + name + '",'
        isUpdatingUserData = true
    }

    if(email && email != "" && email != null) {
        updateUserDataQueryStr = updateUserDataQueryStr + ' `email` = "' + email + '",'
        isUpdatingUserData = true
    }

    if(phone && phone != "" && phone != null) {
      updateUserDataQueryStr = updateUserDataQueryStr + ' `phone` = "' + phone + '",'
      isUpdatingUserData = true
  }

    if (file != undefined && file != null) {  
      if (!file || file.length === 0) {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageImageIsMandatory, ""))
      }
      if(!util.isValidImg(file.originalname)){
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageForImageValidation, ""))
      }
  
      //Uploading image to AWS S3
      const awsResult = await awsHelper.uploadFile(file, constant.s3BucketUserImages);
  
      if(awsResult.error || awsResult.result === null || awsResult === undefined || awsResult.result === undefined) {
        return res.status(constant.responseCodeForBadReaquest).json(util.responseJSON(false , constant.responseMessageForImageUploadFailed, ""))
      }
  
      isUpdatingUserInfo = true;
      updateUserDataQueryStr = updateUserDataQueryStr + ' `profile_picture` = "' + awsResult.result  + '", ';
    }

    if(isUpdatingUserData) {
        updateUserDataQueryStr = updateUserDataQueryStr + ' `updated_at` = "' + util.currentTimestamp() + '" where `id` = "' + authResult.id + '"';

        const resultUserDataUpdated = await mysqlPool.query(updateUserDataQueryStr);
    
        if(resultUserDataUpdated.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, constant.responseMessageYourProfileUpdated, ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Get admin user details===================================================
exports.getUserById = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExistingUser = await mysqlPool.queryWithValues('select * from user where id = ? and (type = "admin" or type = "sub_admin")', [authResult.id])

    if(getExistingUser.error || getExistingUser.result === undefined || getExistingUser.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
    }

    var responseArr = getExistingUser.result[0]
    responseArr.privileges = responseArr.privileges.split(',')

    delete responseArr.password

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseArr));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};