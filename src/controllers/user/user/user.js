const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth');
const awsHelper = require('../../../helper/aws')

// ========================================Update user===================================================
exports.updateUser = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const {first_name, last_name, email, address, landmark, city, state, zip_code} = req.body;
    const file = req.file;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const currentUserData = await authHelper.getUserFromDB(authResult.id);

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
    
    var updateUserInfoQueryStr = 'update client_info set'
    var isUpdatingUserInfo = false

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


// ========================================Get client user details===================================================
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

    const getExistingUser = await mysqlPool.queryWithValues('select * from user where id = ? and type = "client"', [authResult.id])

    if(getExistingUser.error || getExistingUser.result === undefined || getExistingUser.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
    }

    const serviceDetails = await mysqlPool.queryWithValues(`SELECT user.*, client_info.*
                                                            FROM user 
                                                            LEFT JOIN (
                                                              SELECT *
                                                              FROM client_info
                                                            ) AS client_info ON client_info.user_id = user.id

                                                            where user.id = ? and user.type = "client"`, [authResult.id]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const refUserDetails = await mysqlPool.queryWithValues(`SELECT * from client_ref_user where user_id = ?`, [authResult.id]);

    if(refUserDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var responseArr = serviceDetails.result[0]

    responseArr.ref_user = refUserDetails.result[0]
      
    var totalProperties = await mysqlPool.queryWithValues(`SELECT COUNT(*) as properties FROM property where user_id = ?`, [responseArr.id]);
  
    if(totalProperties.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
    
    responseArr.properties = (totalProperties.result[0].properties || 0);


    var totalServices = await mysqlPool.queryWithValues(`SELECT COUNT(*) as services FROM user_service where (user_id = ? and status = 'COMPLETED')`, [responseArr.id]);
  
    if(totalServices.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
    
    responseArr.services = (totalServices.result[0].services || 0);

    delete responseArr.user_id
    delete responseArr.password

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseArr));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};