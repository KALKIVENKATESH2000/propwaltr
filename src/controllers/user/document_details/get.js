const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')

// ========================================Get required documents details for service===================================================
exports.getRequiredDocumentsDetailsForService = async (req, res) => {
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

    const getExistingServiceRequiredDocsDetails = await mysqlPool.queryWithValues('select * from required_service_detail where service_id = ? and sub_service_id = ?', [service_id, sub_service_id])

    if(getExistingServiceRequiredDocsDetails.error || getExistingServiceRequiredDocsDetails.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getExistingServiceRequiredDocsDetails.result));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Get documents===================================================
exports.getUserDocuments = async (req, res) => {
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

    var sql = 'select * from document_details where user_id = ? and '

    if(status === "me") {
      sql = sql + 'document_from = "client"'
    } else if(status === "admin") {
      sql = sql + 'document_from = "admin"'
    }

    const getAddedDetails = await mysqlPool.queryWithValues(sql + ' ORDER BY created_at DESC limit ? offset ?', [authResult.id, pageSize, offset])

    if(getAddedDetails.error || getAddedDetails.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getAddedDetails.result));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Get documents for service===================================================
exports.getUserDocumentsForService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;
    const service_id = req.params.service_id;
    const status = req.params.status;

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

    var sql = 'select * from document_details where user_id = ? and service_id = ? and '

    if(status === "me") {
      sql = sql + 'document_from = "client"'
    } else if(status === "admin") {
      sql = sql + 'document_from = "admin"'
    }

    const getAddedDetails = await mysqlPool.queryWithValues(sql + ' ORDER BY created_at DESC limit ? offset ?', [authResult.id, service_id, pageSize, offset])

    if(getAddedDetails.error || getAddedDetails.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getAddedDetails.result));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Get documents for sub service===================================================
exports.getUserDocumentsForServiceAndSubService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const status = req.params.status;

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

    var sql = 'select * from document_details where user_id = ? and service_id = ? and sub_service_id = ? and '

    if(status === "me") {
      sql = sql + 'document_from = "client"'
    } else if(status === "admin") {
      sql = sql + 'document_from = "admin"'
    }

    const getAddedDetails = await mysqlPool.queryWithValues(sql + ' ORDER BY created_at DESC limit ? offset ?', [authResult.id, service_id, sub_service_id, pageSize, offset])

    if(getAddedDetails.error || getAddedDetails.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getAddedDetails.result));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get documents for user service===================================================
exports.getAdminDocumentsForServiceAndSubService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;
    const status = req.params.status;

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

    const getExistingUserService = await mysqlPool.queryWithValues('select * from user_service where id = ? and service_id = ? and sub_service_id = ?', [user_service_id, service_id, sub_service_id])

    if(getExistingUserService.error || getExistingUserService.result === undefined || getExistingUserService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidUserServiceId + sub_service_id, ""));
    }

    var sql = 'select * from document_details where (user_id = ? and service_id = ? and sub_service_id = ? and user_service_id = ?) and '

    if(status === "me") {
      sql = sql + 'document_from = "client"'
    } else if(status === "admin") {
      sql = sql + 'document_from = "admin"'
    }

    const getAddedDetails = await mysqlPool.queryWithValues(sql + ' ORDER BY created_at DESC limit ? offset ?', [authResult.id, service_id, sub_service_id, user_service_id, pageSize, offset])

    if(getAddedDetails.error || getAddedDetails.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getAddedDetails.result));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get documents for property===================================================
exports.getUserDocumentsForProperty = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;
    const property_id = req.params.property_id;
    const status = req.params.status;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }
    
    const getExistingProperty = await mysqlPool.queryWithValues('select * from property where id = ?', [property_id])

    if(getExistingProperty.error || getExistingProperty.result === undefined || getExistingProperty.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidPropertyId + property_id, ""));
    }

    var sql = 'select * from document_details where user_id = ? and property_id = ? and '

    if(status === "me") {
      sql = sql + 'document_from = "client"'
    } else if(status === "admin") {
      sql = sql + 'document_from = "admin"'
    }

    const getAddedDetails = await mysqlPool.queryWithValues(sql + ' ORDER BY created_at DESC limit ? offset ?', [authResult.id, property_id, pageSize, offset])

    if(getAddedDetails.error || getAddedDetails.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getAddedDetails.result));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};