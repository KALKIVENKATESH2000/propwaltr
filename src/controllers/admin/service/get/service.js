const mysqlPool = require('../../../../helper/mysql')
const util = require('../../../../util/util')
const constant = require('../../../../util/constant')
const authHelper = require('../../../../helper/auth')

// ========================================Get all services===================================================
exports.service = async (req, res) => {
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

    let sql = `
    SELECT *
    FROM service
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [pageSize, offset]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    let services = [];

    for (let index = 0; index < serviceDetails.result.length; index++) {
      const element = serviceDetails.result[index];
      
      const subServicesResult = await mysqlPool.queryWithValues(`select service_id, is_main_service, COUNT(*) AS count from sub_service where (service_id = ? and is_main_service = 0)`, [element.id]);
      const newServicesResult = await mysqlPool.queryWithValues(`select service_id, status, COUNT(*) AS count from user_service where (status in ('new', 'accepted', 'waiting') and service_id = ?)`, [element.id]);
      const ongoingServicesResult = await mysqlPool.queryWithValues(`select service_id, status, COUNT(*) AS count from user_service where (status in ('ongoing', 'reject', 'completed_request', 'dispute') and service_id = ?)`, [element.id]);
      const completedServicesResult = await mysqlPool.queryWithValues(`select service_id, status, COUNT(*) AS count from user_service where (status = 'completed' and service_id = ?)`, [element.id]);

      if(newServicesResult.error || ongoingServicesResult.error || completedServicesResult.error || subServicesResult.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, subServicesResult));
      }

      let sub_services = 0;
      let new_services = 0;
      let ongoing_services = 0;
      let completed_services = 0;

      if(newServicesResult.result.length > 0) {
        new_services = newServicesResult.result[0].count
      } 

      if(ongoingServicesResult.result.length > 0) {
        ongoing_services = ongoingServicesResult.result[0].count
      } 

      if(completedServicesResult.result.length > 0) {
        completed_services = completedServicesResult.result[0].count
      } 

      if(subServicesResult.result.length > 0) {
        sub_services = subServicesResult.result[0].count
      } 

      services.push({
        ...element,
        ...{
          sub_services,
          new_services,
          ongoing_services,
          completed_services,
        }
      })
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", services));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};