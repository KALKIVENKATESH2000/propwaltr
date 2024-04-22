const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth');
const awsHelper = require('../../../helper/aws')

// ========================================Update user===================================================
exports.updateRefUser = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const {first_name, last_name, phone, relation, address, landmark, city, state, zip_code} = req.body;
    const file = req.file;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    var updateUserInfoQueryStr = 'update client_ref_user set'
    var isUpdatingUserInfo = false

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
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' `profile_picture` = "' + awsResult.result  + '", ';
    }

    if(first_name && first_name != "" && first_name != null) {
        updateUserInfoQueryStr = updateUserInfoQueryStr + ' `first_name` = "' + first_name + '",'
        isUpdatingUserInfo = true
    }

    if(last_name && last_name != "" && last_name != null) {
        updateUserInfoQueryStr = updateUserInfoQueryStr + ' `last_name` = "' + last_name + '",'
        isUpdatingUserInfo = true
    }

    if(phone && phone != "" && phone != null) {
        updateUserInfoQueryStr = updateUserInfoQueryStr + ' `phone` = "' + phone + '",'
        isUpdatingUserInfo = true
    }

    if(relation && relation != "" && relation != null) {
        updateUserInfoQueryStr = updateUserInfoQueryStr + ' `relation` = "' + relation + '",'
        isUpdatingUserInfo = true
    }

    if(address && address != "" && address != null) {
        updateUserInfoQueryStr = updateUserInfoQueryStr + ' `address` = "' + address + '",'
        isUpdatingUserInfo = true
    }

    if(landmark && landmark != "" && landmark != null) {
        updateUserInfoQueryStr = updateUserInfoQueryStr + ' `landmark` = "' + landmark + '",'
        isUpdatingUserInfo = true
    }

    if(city && city != "" && city != null) {
        updateUserInfoQueryStr = updateUserInfoQueryStr + ' `city` = "' + city + '",'
        isUpdatingUserInfo = true
    }
 
    if(state && state != "" && state != null) {
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' `state` = "' + state + '",'
      isUpdatingUserInfo = true
    }

    if(zip_code && zip_code != "" && zip_code != null) {
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' `zip_code` = "' + zip_code + '",'
      isUpdatingUserInfo = true
    }

    if(isUpdatingUserInfo) {
      updateUserInfoQueryStr = updateUserInfoQueryStr.substring(0, updateUserInfoQueryStr.length-1);
      updateUserInfoQueryStr = updateUserInfoQueryStr + ' where user_id = "' + authResult.id + '"'

      const resultUserInfoUpdated = await mysqlPool.query(updateUserInfoQueryStr);
    
      if(resultUserInfoUpdated.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
    }
    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, constant.responseMessageYourProfileUpdated, ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};