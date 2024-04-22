const mysqlPool = require('../../../../helper/mysql')
const util = require('../../../../util/util')
const constant = require('../../../../util/constant')
const authHelper = require('../../../../helper/auth')
const awsHelper = require('../../../../helper/aws')

// ========================================Create new service===================================================
exports.service = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const {name, info} = req.body;
    const file = req.file;

    if(!name || name === "" || name === null ||
     !info || info === "" || info === null ||
     !service_id || service_id === "" || service_id === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    var updateQuery = 'update service set name = ?, info = ?, updated_at = ?'

    if (file != undefined && file != null) { 
      if (!file || file.length === 0) {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageImageIsMandatory, ""))
      }
      
      if(!util.isValidImg(file.originalname)){
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageForImageValidation, ""))
      }
  
      //Uploading service image to AWS S3
      const awsResult = await awsHelper.uploadFile(file, constant.s3BucketServiceImages);
  
      if(awsResult.error || awsResult.result === null || awsResult === undefined || awsResult.result === undefined) {
        return res.status(constant.responseCodeForBadReaquest).json(util.responseJSON(false , constant.responseMessageForImageUploadFailed, ""))
      }

      updateQuery = updateQuery + ', image = "' + awsResult.result + '"'
    }

    const databaseValues = [name, info, util.currentTimestamp(), service_id];
    const resultServiceAdded = await mysqlPool.queryWithValues(updateQuery + ' where id = ?', databaseValues);

    if(resultServiceAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, resultServiceAdded));
    }

    const serviceDetails = await mysqlPool.queryWithValues('select * from service where id = ?', [service_id])

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var data = serviceDetails.result[0]

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", data));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Delete service===================================================
exports.deleteService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;

    if(!service_id || service_id === "" || service_id === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    var updateQuery = 'update service set is_deleted = 1, updated_at = ?'

    const databaseValues = [util.currentTimestamp(), service_id];
    const resultServiceAdded = await mysqlPool.queryWithValues(updateQuery + ' where id = ?', databaseValues);

    if(resultServiceAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, resultServiceAdded));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", true));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};