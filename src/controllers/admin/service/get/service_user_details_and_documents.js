const mysqlPool = require('../../../../helper/mysql')
const util = require('../../../../util/util')
const constant = require('../../../../util/constant')
const authHelper = require('../../../../helper/auth')
const awsHelper = require('../../../../helper/aws')

// ========================================Get required documents details for service===================================================
exports.getRequiredDocumentsDetailsForService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;

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

    const getExistingServiceRequiredDocsDetails = await mysqlPool.queryWithValues('select * from required_service_detail where service_id = ?', [service_id])

    if(getExistingServiceRequiredDocsDetails.error || getExistingServiceRequiredDocsDetails.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getExistingServiceRequiredDocsDetails.result));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};