const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')

// ========================================Get notifications===================================================
exports.get = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const notificationsResult = await mysqlPool.queryWithValues(`select * from notification where user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [authResult.id, pageSize, offset])

    if(notificationsResult.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, notificationsResult));
    }

    var notifications = [];

    for (let index = 0; index < notificationsResult.result.length; index++) {
      var notification = notificationsResult.result[index];
     
      const service = await mysqlPool.queryWithValues('select * from service where id = ?', [notification.service_id])

      if(service.result && service.result.length > 0) {
        notification.service = service.result[0];
      } else {
        notification.service = null;
      }

      const subService = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [notification.sub_service_id])

      if(subService.result && subService.result.length > 0) {
        notification.sub_service = subService.result[0];
      } else {
        notification.sub_service = null;
      }

      notifications.push(notification);
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", notifications));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};