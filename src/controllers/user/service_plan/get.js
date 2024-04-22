const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')

// ========================================Get service plans===================================================
exports.getServicePlans = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;

    // const pageNo = parseInt(req.query.pageNo) || 1;
    // const pageSize = parseInt(req.query.pageSize) || 10;
    // const offset = (pageNo - 1) * pageSize;

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

    const duration = ["monthly", "quarterly", "half_yearly", "yearly"]

    var responsePush = {}
    var count = duration.length;

    duration.forEach(async element => {
      const getExistingServicePlans = await mysqlPool.queryWithValues('select * from razorpay_plan where sub_service_id = ? and plan_duration = ? and is_disabled = 0 ORDER BY version_no DESC', [sub_service_id, element])

      if(getExistingServicePlans.error || getExistingServicePlans.result === undefined) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(getExistingServicePlans, constant.responseMessageInternalServerError, ""));
      }

      const result = getExistingServicePlans.result
      responsePush[element.toUpperCase()] = []

      result.forEach(data => {
        if(responsePush[element.toUpperCase()].some(item => item.plan_frequency === data.plan_frequency) === false) {
          responsePush[element.toUpperCase()].push(data);
        }
      });

      count = count - 1

      if(count === 0) {
        res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responsePush));
      }
    });

  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};