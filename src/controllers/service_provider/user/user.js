const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth');
const awsHelper = require('../../../helper/aws')

// ========================================Update user===================================================
exports.updateUser = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const {first_name, last_name, email, home_address, home_state, home_zip_code, work_address, work_state, work_zip_code,
      aadhar_card, pan_card, qualification, ref_user, ref_user_contact} = req.body;
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

    if(first_name && first_name != "" && first_name != null) {
        updateUserDataQueryStr = updateUserDataQueryStr + ' `first_name` = "' + first_name + '",'
        isUpdatingUserData = true
    }

    if(last_name && last_name != "" && last_name != null) {
        updateUserDataQueryStr = updateUserDataQueryStr + ' `last_name` = "' + last_name + '",'
        isUpdatingUserData = true
    }

    if(email && email != "" && email != null) {
        updateUserDataQueryStr = updateUserDataQueryStr + ' `email` = "' + email + '",'
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
  
      isUpdatingUserData = true;
      updateUserDataQueryStr = updateUserDataQueryStr + ' `profile_picture` = "' + awsResult.result  + '", ';
    }

    if(isUpdatingUserData) {
        updateUserDataQueryStr = updateUserDataQueryStr + ' `updated_at` = "' + util.currentTimestamp() + '" where `id` = "' + authResult.id + '"';

        const resultUserDataUpdated = await mysqlPool.query(updateUserDataQueryStr);
    
        if(resultUserDataUpdated.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }
    }
    
    var updateUserInfoQueryStr = 'update service_provider_info set'
    var isUpdatingUserInfo = false

    if(home_address && home_address != "" && home_address != null) {
        updateUserInfoQueryStr = updateUserInfoQueryStr + ' `home_address` = "' + home_address + '",'
        isUpdatingUserInfo = true
    }

    if(home_state && home_state != "" && home_state != null) {
        updateUserInfoQueryStr = updateUserInfoQueryStr + ' `home_state` = "' + home_state + '",'
        isUpdatingUserInfo = true
    }

    if(home_zip_code && home_zip_code != "" && home_zip_code != null) {
        updateUserInfoQueryStr = updateUserInfoQueryStr + ' `home_zip_code` = "' + home_zip_code + '",'
        isUpdatingUserInfo = true
    }
 
    if(work_address && work_address != "" && work_address != null) {
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' `work_address` = "' + work_address + '",'
      isUpdatingUserInfo = true
    }

    if(work_state && work_state != "" && work_state != null) {
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' `work_state` = "' + work_state + '",'
      isUpdatingUserInfo = true
    }

    if(work_zip_code && work_zip_code != "" && work_zip_code != null) {
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' `work_zip_code` = "' + work_zip_code + '",'
      isUpdatingUserInfo = true
    }

    if(aadhar_card && aadhar_card != "" && aadhar_card != null) {
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' `aadhar_card` = "' + aadhar_card + '",'
      isUpdatingUserInfo = true
    }

    if(pan_card && pan_card != "" && pan_card != null) {
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' `pan_card` = "' + pan_card + '",'
      isUpdatingUserInfo = true
    }

    if(qualification && qualification != "" && qualification != null) {
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' `qualification` = "' + qualification + '",'
      isUpdatingUserInfo = true
    }

    if(ref_user && ref_user != "" && ref_user != null) {
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' `ref_user` = "' + ref_user + '",'
      isUpdatingUserInfo = true
    }

    if(ref_user_contact && ref_user_contact != "" && ref_user_contact != null) {
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' `ref_user_contact` = "' + ref_user_contact + '",'
      isUpdatingUserInfo = true
    }

    if(isUpdatingUserInfo) {
      updateUserInfoQueryStr = updateUserInfoQueryStr.substring(0, updateUserInfoQueryStr.length-1);
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' where user_id = "' + authResult.id + '"'

      const resultUserInfoUpdated = await mysqlPool.query(updateUserInfoQueryStr);
    
      if(resultUserInfoUpdated.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, resultUserInfoUpdated));
      }
    }
    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, constant.responseMessageYourProfileUpdated, ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};