const mysqlPool = require('../../../../helper/mysql')
const util = require('../../../../util/util')
const constant = require('../../../../util/constant')
const authHelper = require('../../../../helper/auth')

// ========================================Get all services counts===================================================
exports.serviceCounts = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];

    if(!autToken || autToken === "" || autToken === null) {
      return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const newServicesResult = await mysqlPool.query(`select status, COUNT(*) AS count from user_service where status in ('new', 'accepted', 'waiting')`);
    const ongoingServicesResult = await mysqlPool.query(`select status, COUNT(*) AS count from user_service where status in ('ongoing', 'reject', 'completed_request', 'dispute')`);
    const completedServicesResult = await mysqlPool.query(`select status, COUNT(*) AS count from user_service where status = 'completed'`);

    if(newServicesResult.error || ongoingServicesResult.error || completedServicesResult.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ''));
    }

    let new_services = 0;
    let ongoing_services = 0;
    let completed_services = 0;
    let revenue = 0;

    if(newServicesResult.result.length > 0) {
      new_services = newServicesResult.result[0].count
    } 

    if(ongoingServicesResult.result.length > 0) {
      ongoing_services = ongoingServicesResult.result[0].count
    } 

    if(completedServicesResult.result.length > 0) {
      completed_services = completedServicesResult.result[0].count
    } 

    const revenueDetails = await mysqlPool.query('select ROUND(SUM(total_amount)) AS revenue from purchase where status = "SUCCESS"');

    if(revenueDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, revenueDetails));
    }

    if(revenueDetails.result.length > 0) {
      revenue = revenueDetails.result[0].revenue
    } 

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", {
      new_services,
      ongoing_services,
      completed_services,
      revenue,
    }));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get all sub services counts===================================================
exports.subServiceCounts = async (req, res) => {
  try {
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const autToken = req.headers[constant.authorization];

    if(!autToken || autToken === "" || autToken === null) {
      return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }
    
    const newServicesResult = await mysqlPool.queryWithValues(`select sub_service_id, status, COUNT(*) AS count from user_service where (status in ('new', 'accepted', 'waiting') and sub_service_id = ?)`, [sub_service_id]);
    const ongoingServicesResult = await mysqlPool.queryWithValues(`select sub_service_id, status, COUNT(*) AS count from user_service where (status in ('ongoing', 'reject', 'completed_request', 'dispute') and sub_service_id = ?)`, [sub_service_id]);
    const completedServicesResult = await mysqlPool.queryWithValues(`select sub_service_id, status, COUNT(*) AS count from user_service where (status = 'completed' and sub_service_id = ?)`, [sub_service_id]);

    if(newServicesResult.error || ongoingServicesResult.error || completedServicesResult.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ''));
    }

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

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", {
      new_services,
      ongoing_services,
      completed_services,
    }));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};