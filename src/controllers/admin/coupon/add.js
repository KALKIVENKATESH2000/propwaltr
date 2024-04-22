const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')


// ========================================Create new coupon code===================================================
exports.add = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const {code, start_date, end_date, amount, discount_type, status, type} = req.body;

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

      
    const getExistingCoupon = await mysqlPool.queryWithValues('select * from coupon where code = ?', [code])

    if(getExistingCoupon.error || getExistingCoupon.result === undefined || getExistingCoupon.result.length > 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageCouponCodeAlreadyExist, ""));
    }

    const id = util.getDBId()
    const databaseValues = [id, authResult.id, code, start_date, end_date, amount, discount_type, status, type, util.currentTimestamp()];
    const resultCouponAdded = await mysqlPool.queryWithValues('INSERT INTO coupon (`id`, `user_id`,`code`,`start_date`, `end_date`, `amount`, `discount_type`, `status`, `type`, `created_at`) VALUES (?)', [databaseValues]);

    if(resultCouponAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const CouponDetails = await mysqlPool.queryWithValues('select * from coupon where id = ?', [id])

    if(CouponDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var data = CouponDetails.result[0]

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", data));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};