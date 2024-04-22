const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const razorpayHelper = require('../../../helper/razorpay')
const notificationHelper = require('../../../helper/notification')

// ========================================refund amount===================================================
exports.refund = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const dispute_id = req.params.dispute_id;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getDispute = await mysqlPool.queryWithValues('select * from dispute where id = ?', [dispute_id])

    if(getDispute.error || getDispute.result === undefined || getDispute.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidDisputeId + dispute_id, ""));
    }
  
    const dispute = getDispute.result[0]

    const getUserService = await mysqlPool.queryWithValues('select * from user_service where id = ?', [dispute.user_service_id])

    if(getUserService.error || getUserService.result === undefined || getUserService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidUserServiceId + dispute.user_service_id, ""));
    }

    const userService = getUserService.result[0]
    
    const getExistingPurchase = await mysqlPool.queryWithValues('select * from purchase where id = ?', [userService.purchase_id])

    if(getExistingPurchase.error || getExistingPurchase.result === undefined || getExistingPurchase.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidSubServicePlanId, ""));
    }

    const purchase = getExistingPurchase.result[0]

    const refund = await razorpayHelper.initRefundToClient(purchase.payment_id, purchase.total_amount, {
      service_id:userService.service_id,
      sub_service_id:userService.sub_service_id,
      user_id:userService.user_id,
      property_id: userService.property_id
    });

    if(refund === '') {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageRefundNotCreated, ""));
    }
    
    const resultUserServiceUpdated = await mysqlPool.queryWithValues(`update user_service set razorpay_refund_id = ?, updated_at = ? where id = ?`, [refund.id, util.currentTimestamp(), dispute.user_service_id]);

    if(resultUserServiceUpdated.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const resultDisputeUpdated = await mysqlPool.queryWithValues(`update dispute set status = "REFUND" where id = ?`, [dispute_id]);

    if(resultDisputeUpdated.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    notificationHelper.sendNotificationForServiceDisputeRefund(userService.user_id, {
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

// ========================================resolved dispute===================================================
exports.resolved = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const dispute_id = req.params.dispute_id;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getDispute = await mysqlPool.queryWithValues('select * from dispute where id = ?', [dispute_id])

    if(getDispute.error || getDispute.result === undefined || getDispute.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidDisputeId + dispute_id, ""));
    }
  
    const dispute = getDispute.result[0]

    const getUserService = await mysqlPool.queryWithValues('select * from user_service where id = ?', [dispute.user_service_id])

    if(getUserService.error || getUserService.result === undefined || getUserService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidUserServiceId + dispute.user_service_id, ""));
    }

    const userService = getUserService.result[0]
    
    const resultDisputeUpdated = await mysqlPool.queryWithValues(`update dispute set status = "RESOLVED" where id = ?`, [dispute_id]);

    if(resultDisputeUpdated.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const serviceDetails = await mysqlPool.queryWithValues(`update user_service set status = "COMPLETED_REQUEST", updated_at = ? where id = ?`, [util.currentTimestamp(), dispute.user_service_id]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    notificationHelper.sendNotificationForServiceDisputeResolved(userService.user_id, {
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

// ========================================open dispute===================================================
exports.open = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const dispute_id = req.params.dispute_id;
    const status = req.params.status;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getDispute = await mysqlPool.queryWithValues('select * from dispute where id = ?', [dispute_id])

    if(getDispute.error || getDispute.result === undefined || getDispute.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidDisputeId + dispute_id, ""));
    }
  
    const dispute = getDispute.result[0]

    if(status.toLowerCase() === 'refund') {
      const getUserService = await mysqlPool.queryWithValues('select * from user_service where id = ?', [dispute.user_service_id])

      if(getUserService.error || getUserService.result === undefined || getUserService.result.length === 0) {
        return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidUserServiceId + dispute.user_service_id, ""));
      }

      const userService = getUserService.result[0]
      
      const getExistingPurchase = await mysqlPool.queryWithValues('select * from purchase where id = ?', [userService.purchase_id])

      if(getExistingPurchase.error || getExistingPurchase.result === undefined || getExistingPurchase.result.length === 0) {
        return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidSubServicePlanId, ""));
      }
  
      const purchase = getExistingPurchase.result[0]

      const refund = await razorpayHelper.initRefundToClient(purchase.payment_id, purchase.total_amount, {
        service_id:userService.service_id,
        sub_service_id:userService.sub_service_id,
        user_id:userService.user_id,
        property_id: userService.property_id
      });

      if(refund === '') {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageRefundNotCreated, ""));
      }
      
      const resultUserServiceUpdated = await mysqlPool.queryWithValues(`update user_service set razorpay_refund_id = ?, updated_at = ? where id = ?`, [refund.id, util.currentTimestamp(), dispute.user_service_id]);
  
      if(resultUserServiceUpdated.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
    }

    const resultDisputeUpdated = await mysqlPool.queryWithValues(`update dispute set status = ? where id = ?`, [status, dispute_id]);

    if(resultDisputeUpdated.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};