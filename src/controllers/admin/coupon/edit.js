const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')


// ========================================Edit coupon code===================================================
exports.edit = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const {code, start_date, end_date, amount, discount_type, status, type} = req.body;
    const coupon_id = req.params.coupon_id;

    if(!code || code === "" || code === null ||
     !start_date || start_date === "" || start_date === null ||
     !end_date || end_date === "" || end_date === null ||
     !amount || amount === "" || amount === null ||
     !discount_type || discount_type === "" || discount_type === null ||
     !status || status === "" || status === null ||
     !type || type === "" || type === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(code.length > 10 || code.length < 5) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageInvalidCouponCode, ""));
    }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

      
    const getExistingCoupon = await mysqlPool.queryWithValues('select * from coupon where id = ?', [coupon_id])

    if(getExistingCoupon.error || getExistingCoupon.result === undefined || getExistingCoupon.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidCouponCodeId + coupon_id, ""));
    }
  
    if(getExistingCoupon.result[0].code != code) {
      const getExistingCoupon = await mysqlPool.queryWithValues('select * from coupon where code = ?', [code])

      if(getExistingCoupon.error || getExistingCoupon.result === undefined || getExistingCoupon.result.length > 0) {
        return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageCouponCodeAlreadyExist, ""));
      }
    }

    const databaseValues = [code, start_date, end_date, amount, discount_type, status, type, coupon_id];
    const resultCouponAdded = await mysqlPool.queryWithValues('update coupon set `code` = ?,`start_date` = ?, `end_date` = ?, `amount` = ?, `discount_type` = ?, `status` = ?, `type` = ? where id = ?', databaseValues);

    if(resultCouponAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const CouponDetails = await mysqlPool.queryWithValues('select * from coupon where id = ?', [coupon_id])

    if(CouponDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var data = CouponDetails.result[0]

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", data));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================update coupon status===================================================
exports.updateStatus = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const coupon_id = req.params.coupon_id;
    const status = req.params.status;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExistingCoupon = await mysqlPool.queryWithValues('select * from coupon where id = ?', [coupon_id])

    if(getExistingCoupon.error || getExistingCoupon.result === undefined || getExistingCoupon.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidCouponCodeId + coupon_id, ""));
    }
  
    const resultCouponAdded = await mysqlPool.queryWithValues('update coupon set `status` = ? where id = ?', [status, coupon_id]);

    if(resultCouponAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};