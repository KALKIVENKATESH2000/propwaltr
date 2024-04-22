const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const razorpayHelper = require('../../../helper/razorpay')
const notificationHelper = require('../../../helper/notification')

// ========================================Get cart details===================================================
exports.getCartDetails = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const { sub_service_ids } = req.body;

    if(!sub_service_ids || sub_service_ids.length === 0) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
  }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const sub_service = await mysqlPool.queryWithValues('select * from sub_service where id in (?)', [(sub_service_ids)])

    if(sub_service.error || sub_service.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    let sub_services = [];

    for (let index = 0; index < sub_service.result.length; index++) {
      const element = sub_service.result[index];
      
      const service = await mysqlPool.queryWithValues('select * from service where id = ? and is_deleted = 0', [element.service_id])

      if(service.result && service.result.length > 0) {
        element.service = service.result[0];
        sub_services.push(element);
      }
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", sub_services));

  } catch(error) {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};