const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const notificationHelper = require('../../../helper/notification')

// ========================================Create dispute for user service===================================================
exports.dispute = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;

    const { service_provider_id } = req.body;

    if(!service_provider_id || service_provider_id === "" || service_provider_id === null) {
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

    const getExistingSubService = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [sub_service_id])

    if(getExistingSubService.error || getExistingSubService.result === undefined || getExistingSubService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidSubServiceId + sub_service_id, ""));
    }

    const getExistingUserService = await mysqlPool.queryWithValues('select * from user_service where id = ?', [user_service_id])

    if(getExistingUserService.error || getExistingUserService.result === undefined || getExistingUserService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidUserServiceId + user_service_id, ""));
    }

    const getExistingServiceProvider = await mysqlPool.queryWithValues(`select * from user where id = ? and (type = 'service_provider' or type = 'admin')`, [service_provider_id])

    if(getExistingServiceProvider.error || getExistingServiceProvider.result === undefined || getExistingServiceProvider.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidServiceProvider, ""));
    }

    const userService = getExistingUserService.result[0]

    if(userService.status.toLowerCase() != 'completed_request') {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageServicePaymentNotDoneYet, ""));
    }

    let sql = `INSERT INTO dispute (id, service_id, sub_service_id, client_id, service_provider_id, user_service_id, status, created_at) VALUES (?)`;
    const id = util.getDBId()
    const disputeAdded = await mysqlPool.queryWithValues(sql, [[id, service_id, sub_service_id, authResult.id, service_provider_id, user_service_id, 'OPEN', util.currentTimestamp()]]);

    if(disputeAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const serviceDetails = await mysqlPool.queryWithValues(`update user_service set status = "DISPUTE", updated_at = ? where id = ?`, [util.currentTimestamp(), user_service_id]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    const getExistingUserServiceDispute = await mysqlPool.queryWithValues('select * from dispute where id = ?', [id])

    if(getExistingUserServiceDispute.error || getExistingUserServiceDispute.result === undefined || getExistingUserServiceDispute.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    notificationHelper.sendNotificationForServiceDisputeCreate(userService.service_provider_id, {
      service_id: userService.service_id,
      sub_service_id: userService.sub_service_id,
      user_service_id: userService.id,
      thread_id: ""
    })

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getExistingUserServiceDispute.result[0]));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};