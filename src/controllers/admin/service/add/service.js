const mysqlPool = require('../../../../helper/mysql')
const util = require('../../../../util/util')
const constant = require('../../../../util/constant')
const authHelper = require('../../../../helper/auth')
const awsHelper = require('../../../../helper/aws')

// ========================================Create new service===================================================
exports.service = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const {name, info} = req.body;
    const file = req.file;

    if(!name || name === "" || name === null || !info || info === "" || info === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

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

    const serviceId = util.getDBId()
    const databaseValues = [serviceId, authResult.id, awsResult.result, name, info, util.currentTimestamp(), util.currentTimestamp()];
    const resultServiceAdded = await mysqlPool.queryWithValues('INSERT INTO service (`id`, `user_id`,`image`,`name`,`info`,`created_at`,`updated_at`) VALUES (?)', [databaseValues]);

    if(resultServiceAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const serviceDetails = await mysqlPool.queryWithValues('select * from service where id = ?', [serviceId])

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var data = serviceDetails.result[0]

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", data));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};