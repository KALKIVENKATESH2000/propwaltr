const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const notificationHelper = require('../../../helper/notification')

// ========================================Service complete===================================================
exports.serviceComplete = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;

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

    const userService = getExistingUserService.result[0]

    if(userService.status.toLowerCase() != 'completed_request') {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageServicePaymentNotDoneYet, ""));
    }

    let sql = `update user_service set status = "COMPLETED", updated_at = ? where id = ?`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [util.currentTimestamp(), user_service_id]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    notificationHelper.sendNotificationForServiceCompleteAccept(userService.service_provider_id, {
      service_id: userService.service_id,
      sub_service_id: userService.sub_service_id,
      user_service_id: userService.id,
      thread_id: ""
    })

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Service complete reject===================================================
exports.serviceCompleteReject = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;

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

    const userService = getExistingUserService.result[0]

    if(userService.status.toLowerCase() != 'completed_request') {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageServicePaymentNotDoneYet, ""));
    }

    let sql = `update user_service set status = "REJECT", updated_at = ? where id = ?`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [util.currentTimestamp(), user_service_id]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    notificationHelper.sendNotificationForServiceCompleteReject(userService.service_provider_id, {
      service_id: userService.service_id,
      sub_service_id: userService.sub_service_id,
      user_service_id: userService.id,
      thread_id: ""
    })

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get user service details===================================================
exports.getUserServiceDetails = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;

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

    const userService = getExistingUserService.result[0]

    const service = await mysqlPool.queryWithValues('select * from service where id = ?', [userService.service_id])

    if(service.result && service.result.length > 0) {
      userService.service = service.result[0];
    } else {
      userService.service = null;
    }

    const property = await mysqlPool.queryWithValues('select * from property where id = ?', [userService.property_id])

    if(property.result && property.result.length > 0) {
      userService.property = property.result[0];
    } else {
      userService.property = null;
    }


    const sub_service = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [userService.sub_service_id])

    if(sub_service.result && sub_service.result.length > 0) {
      userService.sub_service = sub_service.result[0];
    } else {
      userService.sub_service = null;
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", userService));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};