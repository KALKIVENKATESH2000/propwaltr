const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')

// ========================================Validate offer===================================================
exports.validate = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const offer_id = req.params.offer_id;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExistingOffer = await mysqlPool.queryWithValues(`select * from coupon where code = ? and start_date < ? and end_date > ? and status = 'ACTIVE'`, [offer_id, util.currentTimestamp(), util.currentTimestamp()])

    if(getExistingOffer.error || getExistingOffer.result === undefined || getExistingOffer.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidOfferId, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};