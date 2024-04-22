const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const notificationHelper = require('../../../helper/notification')

// ========================================Create review for user service===================================================
exports.review = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;

    const {rating, comment} = req.body;

    if(!rating || rating === null ||
        !comment || comment === "" || comment === null) {
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

    const userService = getExistingUserService.result[0]

    if(userService.status.toLowerCase() != 'completed') {
        return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageServicePaymentNotDoneYet, ""));
    }

    let sql = `INSERT INTO review (id, user_id, service_id, sub_service_id, user_service_id, service_provider_id, rating, comment, created_at, updated_at) VALUES (?)`;
    const id = util.getDBId()
    const serviceDetails = await mysqlPool.queryWithValues(sql, [[id, authResult.id, service_id, sub_service_id, user_service_id, userService.service_provider_id, rating, comment, util.currentTimestamp(), util.currentTimestamp()]]);
 
    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const getExistingUserServiceReview = await mysqlPool.queryWithValues('select * from review where id = ?', [id])

    if(getExistingUserServiceReview.error || getExistingUserServiceReview.result === undefined || getExistingUserServiceReview.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    notificationHelper.sendNotificationForServiceReview(userService.service_provider_id, {
      service_id: userService.service_id,
      sub_service_id: userService.sub_service_id,
      user_service_id: userService.id,
      thread_id: "",
      body: comment
    })

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getExistingUserServiceReview.result[0]));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};