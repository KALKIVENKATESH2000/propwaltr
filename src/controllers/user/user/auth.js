const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const twilio = require('../../../helper/twilio')
const sharedModule = require('../../../controllers/shared_modules/auth')

// ========================================Send OTP to phone===================================================
exports.phone = async (req, res) => {
  try {
    const phone = req.body.phone;

    if(!phone || phone === "" || phone === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }
  
    const result = await twilio.sendOTPToUser(phone)
  
    if(result.status === "pending") {
      res.status(constant.responseCodeSuccess).json(util.responseJSON(true, constant.responseMessageOTPSendSuccess + phone, ""));
    } else {
      res.status(constant.responseCodeSuccess).json(util.responseJSON(false, constant.responseMessageOTPSendFailed.replace('#', phone), ""));
    }
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Verify OTP===================================================
exports.verifyOTP = async (req, res) => {
  try {
    const {phone, otp} = req.body;

    if(!phone || phone === "" || phone === null || !otp || otp === "" || otp === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    const result = await twilio.verifyUserOTP(phone, otp)

    
    // if(result.status === "approved") {

      const resultUserByPhone = await mysqlPool.queryWithValues('select * from user where phone = ? and type = "client"', [phone])

      if(resultUserByPhone.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }

      if(resultUserByPhone.result.length === 0) {
        //need to create new user and new session

        const user_id = util.getDBId();
        const databaseValues = [user_id, phone, 'client', '', '', '', '', 1, 0, 0, 0, '', '', util.currentTimestamp(), util.currentTimestamp()];
        const resultUserAdded = await mysqlPool.queryWithValues('INSERT INTO user (`id`, `phone`,`type`,`first_name`,`last_name`,`email`,`password`,`is_verified`,`avg_rating`,`is_blocked`,`is_disabled`,`razorpay_user_id`,`privileges`,`created_at`,`updated_at`) VALUES (?)', [databaseValues]);
        const resultUseInfoAdded = await mysqlPool.queryWithValues('INSERT INTO client_info (`user_id`)  VALUES (?)', [[user_id]]);
        const resultUseRefUserAdded = await mysqlPool.queryWithValues('INSERT INTO client_ref_user (`user_id`)  VALUES (?)', [[user_id]]);

        if(resultUserAdded.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }

        const resultUserByPhone = await mysqlPool.queryWithValues('select * from user where phone = ?', [phone])

        if(resultUserByPhone.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }

        var userData = resultUserByPhone.result[0]
        const authToken = await sharedModule.createNewSession(userData.id);
       
        if(authToken === "") {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }

        userData.properties = 0;
        userData.services = 0;

        userData.token = authToken.token;
        userData.ws_key = authToken.id;
        delete userData.password;
        res.status(constant.responseCodeSuccess).json(util.responseJSON(true, constant.responseMessageOTPVerified, userData));

      } else {
        //need to create new session
        var userData = resultUserByPhone.result[0]

        if(userData.is_blocked === 1) {
            //account blocked by admin
            return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageAccountBlockedByAdmin, ""));
        }

        if(userData.is_disabled === 1) {
            //account deleted by user
            return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageAccountDeletedByUser, ""));
        }

        const authToken = await sharedModule.createNewSession(userData.id);
       
        if(authToken === "") {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }
       
        var totalProperties = await mysqlPool.queryWithValues(`SELECT COUNT(*) as properties FROM property where user_id = ?`, [userData.id]);
  
        if(totalProperties.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }
        
        userData.properties = (totalProperties.result[0].properties || 0);
    
    
        var totalServices = await mysqlPool.queryWithValues(`SELECT COUNT(*) as services FROM user_service where (user_id = ? and status = 'COMPLETED')`, [userData.id]);
      
        if(totalServices.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }
        
        userData.services = (totalServices.result[0].services || 0);

        
        userData.token = authToken.token;
        userData.ws_key = authToken.id;
        delete userData.password;
        res.status(constant.responseCodeSuccess).json(util.responseJSON(true, constant.responseMessageOTPVerified, userData));
      }
    // } else {
    //   res.status(constant.responseCodeSuccess).json(util.responseJSON(false, constant.responseMessageOTPNotVerified, ""));
    // }
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};