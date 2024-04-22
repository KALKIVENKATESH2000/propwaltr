const mysqlPool = require('../../../../helper/mysql')
const util = require('../../../../util/util')
const constant = require('../../../../util/constant')
const authHelper = require('../../../../helper/auth')

// ========================================Edit sub service===================================================
exports.subService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const {is_main_service, name, info, turn_around_time, plans, amount} = req.body;
    
    if(!service_id || service_id === "" || service_id === null ||
    !sub_service_id || sub_service_id === "" || sub_service_id === null ||
    !name || name === "" || name === null ||
     !info || info === "" || info === null ||
     is_main_service === "" || is_main_service === null ||
     !plans ||
     !turn_around_time || turn_around_time === "" || turn_around_time === null ||
     !amount) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

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

    const databaseValues = [name, info, turn_around_time, JSON.stringify(plans), amount, is_main_service, sub_service_id];
    const resultSubServiceAdded = await mysqlPool.queryWithValues('update sub_service set name = ?, info = ?, turn_around_time = ?, plans = ?, amount = ?, is_main_service = ? where id = ?', databaseValues);

    if(resultSubServiceAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const serviceDetails = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [sub_service_id])

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var data = serviceDetails.result[0]

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", data));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Enable disable sub service===================================================
exports.subServiceEnableDisable = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const enableDisable = req.params.enableDisable;

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

    const getExistingSubService = await mysqlPool.queryWithValues('select * from sub_service where id = ? and service_id = ?', [sub_service_id, service_id])

    if(getExistingSubService.error || getExistingSubService.result === undefined || getExistingSubService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidSubServiceId + sub_service_id, ""));
    }

    if(enableDisable === "enable") {
      const enableSubServiceResult = await mysqlPool.queryWithValues('update sub_service set is_disabled = 0 where id = ? and service_id = ?', [sub_service_id, service_id])

      if(enableSubServiceResult.error || enableSubServiceResult.result === undefined || enableSubServiceResult.result.length === 0) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
    } else if(enableDisable === "disable") {
      const disableSubServiceResult = await mysqlPool.queryWithValues('update sub_service set is_disabled = 1 where id = ? and service_id = ?', [sub_service_id, service_id])

      if(disableSubServiceResult.error || disableSubServiceResult.result === undefined || disableSubServiceResult.result.length === 0) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
    } else {
      throw Error ('invlid type')
    }
   
    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Delete sub service===================================================
exports.deleteSubService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;

    if(!service_id || service_id === "" || service_id === null ||
    !sub_service_id || sub_service_id === "" || sub_service_id === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    var updateQuery = 'update sub_service set is_deleted = 1'

    const databaseValues = [sub_service_id];
    const resultServiceAdded = await mysqlPool.queryWithValues(updateQuery + ' where id = ?', databaseValues);

    if(resultServiceAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, resultServiceAdded));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", true));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};