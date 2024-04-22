const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')


// ========================================Get coupon codes===================================================
exports.get = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;
    const status = req.params.status;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }
    
    var whereClause = ''
    
    if (status !== 'all') {
        whereClause = ` where status = "${status}"`
    } else {
      whereClause = ` where status not in ('DEACTIVATE')`
    }

    const CouponDetails = await mysqlPool.queryWithValues(`select * from coupon${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [pageSize, offset])

    if(CouponDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, CouponDetails));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", CouponDetails.result));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};
