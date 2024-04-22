const mysqlPool = require('../../../../helper/mysql')
const util = require('../../../../util/util')
const constant = require('../../../../util/constant')
const authHelper = require('../../../../helper/auth')
const awsHelper = require('../../../../helper/aws')

// ========================================Create new service===================================================
exports.serviceRequiredUserDetails = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id
    const fields = req.body;

    if(!fields || fields === "" || fields === null ||
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

    const getExistingService = await mysqlPool.queryWithValues('select * from service where id = ?', [service_id])

    if(getExistingService.error || getExistingService.result === undefined || getExistingService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidServiceId + service_id, ""));
    }
    
    for (const [key, value] of Object.entries(fields)) {
      const getExistingSubService = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [key])

      if(getExistingSubService.error || getExistingSubService.result === undefined || getExistingSubService.result.length === 0) {
        res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidSubServiceId + key, ""));
        return;
      }
    }

    for (const [key, value] of Object.entries(fields)) {
      value.forEach(async item => {
        const id = util.getDBId()
        const databaseValues = [id, service_id, key, item.title, 'text', item.type, util.currentTimestamp()];
        const resultServiceAdded = await mysqlPool.queryWithValues('INSERT INTO required_service_detail (`id`, `service_id`,`sub_service_id`,`title`,`data_type`,`type`,`created_at`) VALUES (?)', [databaseValues]);
      });
    }

    return res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));

  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};