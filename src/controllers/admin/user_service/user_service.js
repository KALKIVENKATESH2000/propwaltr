const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const notificationHelper = require('../../../helper/notification')
const sharedModule = require('../../../controllers/shared_modules/document_details')

// ========================================Assign service===================================================
exports.assignService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;
    const {service_provider_id} = req.body;
    
    if(!service_id || service_id === "" || service_id === null ||
    !sub_service_id || sub_service_id === "" || sub_service_id === null ||
     !user_service_id || user_service_id === "" || user_service_id === null ||
     !service_provider_id || service_provider_id === "" || service_provider_id === null) {
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

    const getExistingUserService = await mysqlPool.queryWithValues('select * from user_service where id = ?', [user_service_id])

    if(getExistingUserService.error || getExistingUserService.result === undefined || getExistingUserService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidUserServiceId + user_service_id, ""));
    }

    const getExistingUser = await mysqlPool.queryWithValues(`select * from user where id = ? and type in ('service_provider', 'sub_admin', 'admin')`, [service_provider_id])

    if(getExistingUser.error || getExistingUser.result === undefined || getExistingUser.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
    }

    const resultSubServiceAdded = await mysqlPool.queryWithValues('update user_service set status = "REQUEST", service_provider_id = ?, assigned_by = ?, updated_at = ? where id = ?', [service_provider_id, authResult.id, util.currentTimestamp(), user_service_id]);

    if(resultSubServiceAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const userService = getExistingUserService.result[0]

    notificationHelper.sendNotificationForNewRequestToServiceProvider(service_provider_id, {
      service_id: userService.service_id,
      sub_service_id: userService.sub_service_id,
      user_service_id: userService.id,
      thread_id: ""
    })
    
    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Accept request===================================================
exports.acceptRequest = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;
    
    if(!service_id || service_id === "" || service_id === null ||
    !sub_service_id || sub_service_id === "" || sub_service_id === null ||
     !user_service_id || user_service_id === "" || user_service_id === null) {
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

    const getExistingUserService = await mysqlPool.queryWithValues('select * from user_service where id = ? and service_provider_id = ?', [user_service_id, authResult.id])

    if(getExistingUserService.error || getExistingUserService.result === undefined || getExistingUserService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidUserServiceId + user_service_id, ""));
    }

    const resultSubServiceAdded = await mysqlPool.queryWithValues('update user_service set status = "ACCEPTED", updated_at = ? where id = ?', [util.currentTimestamp(), user_service_id]);

    if(resultSubServiceAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const userService = getExistingUserService.result[0]
    
    notificationHelper.sendNotificationForServiceRequestAccepted(userService.user_id, {
      service_id: userService.service_id,
      sub_service_id: userService.sub_service_id,
      user_service_id: userService.id,
      thread_id: ""
    })

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Waiting for required documents and details===================================================
exports.waitingForDocuments = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;
    
    if(!service_id || service_id === "" || service_id === null ||
    !sub_service_id || sub_service_id === "" || sub_service_id === null ||
     !user_service_id || user_service_id === "" || user_service_id === null) {
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

    const getExistingUserService = await mysqlPool.queryWithValues('select * from user_service where id = ? and service_provider_id = ?', [user_service_id, authResult.id])

    if(getExistingUserService.error || getExistingUserService.result === undefined || getExistingUserService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidUserServiceId + user_service_id, ""));
    }

    const resultSubServiceAdded = await mysqlPool.queryWithValues('update user_service set status = "WAITING", updated_at = ? where id = ?', [util.currentTimestamp(), user_service_id]);

    if(resultSubServiceAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const userService = getExistingUserService.result[0]
    
    notificationHelper.sendNotificationForServiceWaitingForDocumentsAndDetails(userService.user_id, {
      service_id: userService.service_id,
      sub_service_id: userService.sub_service_id,
      user_service_id: userService.id,
      thread_id: ""
    })

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Start service===================================================
exports.startService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;
    
    if(!service_id || service_id === "" || service_id === null ||
    !sub_service_id || sub_service_id === "" || sub_service_id === null ||
     !user_service_id || user_service_id === "" || user_service_id === null) {
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

    const getExistingUserService = await mysqlPool.queryWithValues('select * from user_service where id = ? and service_provider_id = ?', [user_service_id, authResult.id])

    if(getExistingUserService.error || getExistingUserService.result === undefined || getExistingUserService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidUserServiceId + user_service_id, ""));
    }

    const getUserServiceVisits = await mysqlPool.queryWithValues('select * from user_service_visit where (service_id = ? and sub_service_id = ? and user_service_id = ?)', [service_id, sub_service_id, user_service_id])

    if(getUserServiceVisits.error || getUserServiceVisits.result === undefined || getUserServiceVisits.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidUserServiceId + user_service_id, ""));
    }

    var lastDateForService = util.currentTimestamp();
    var vistiDuration = 0;

    for (let index = 0; index < getUserServiceVisits.result.length; index++) {
      const visit = getUserServiceVisits.result[index];
      const subService = getExistingSubService.result[0];
      vistiDuration = vistiDuration + subService.turn_around_time;
      lastDateForService = util.getTimestamp(vistiDuration);

      const updateVisitExpireDate = await mysqlPool.queryWithValues('update user_service_visit set turn_around_time = ? where id = ?', [lastDateForService, visit.id]);

      if(updateVisitExpireDate.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
    }
    
    const resultSubServiceAdded = await mysqlPool.queryWithValues('update user_service set status = "ONGOING", turn_around_date = ?, updated_at = ? where id = ?', [lastDateForService, util.currentTimestamp(), user_service_id]);

    if(resultSubServiceAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const userService = getExistingUserService.result[0]
    
    notificationHelper.sendNotificationForStartService(userService.user_id, {
      service_id: userService.service_id,
      sub_service_id: userService.sub_service_id,
      user_service_id: userService.id,
      thread_id: ""
    })

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Complete service===================================================
exports.completeService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;
    
    if(!service_id || service_id === "" || service_id === null ||
    !sub_service_id || sub_service_id === "" || sub_service_id === null ||
     !user_service_id || user_service_id === "" || user_service_id === null) {
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

    const getExistingUserService = await mysqlPool.queryWithValues('select * from user_service where id = ? and service_provider_id = ?', [user_service_id, authResult.id])

    if(getExistingUserService.error || getExistingUserService.result === undefined || getExistingUserService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidUserServiceId + user_service_id, ""));
    }

    const resultSubServiceAdded = await mysqlPool.queryWithValues('update user_service set status = "COMPLETED_REQUEST", updated_at = ? where id = ?', [util.currentTimestamp(), user_service_id]);

    if(resultSubServiceAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const userService = getExistingUserService.result[0]
    
    notificationHelper.sendNotificationForServiceCompleteRequest(userService.user_id, {
      service_id: userService.service_id,
      sub_service_id: userService.sub_service_id,
      user_service_id: userService.id,
      thread_id: ""
    })

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get user service===================================================
exports.get = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const user_service_id = req.params.user_service_id;

    if(!user_service_id || user_service_id === "" || user_service_id === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
  }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getUserService = await mysqlPool.queryWithValues('select * from user_service where id = ?', [user_service_id])

    if(getUserService.error || getUserService.result === undefined || getUserService.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var responseDic = getUserService.result[0];

    const getUser = await mysqlPool.queryWithValues('select * from user where id = ?', [responseDic.user_id])

    if(getUser.error || getUser.result === undefined || getUser.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    responseDic.user = getUser.result[0]

    const getService = await mysqlPool.queryWithValues('select * from service where id = ?', [responseDic.service_id])

    if(getService.error || getService.result === undefined || getService.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    responseDic.service = getService.result[0]

    const getSubService = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [responseDic.sub_service_id])

    if(getSubService.error || getSubService.result === undefined || getSubService.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    responseDic.sub_service = getSubService.result[0]

    const getProperty = await mysqlPool.queryWithValues('select * from property where id = ?', [responseDic.property_id])

    if(getProperty.error || getProperty.result === undefined || getProperty.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    responseDic.property = getProperty.result[0]

    const getUserDocs = await mysqlPool.queryWithValues(`select * from document_details where user_service_id = ? and type = 'user' and data_type = 'document' and document_from = 'client'`, [responseDic.id])

    if(getUserDocs.error || getUserDocs.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    responseDic.user_documents = getUserDocs.result;


    const getPropertyDocs = await mysqlPool.queryWithValues(`select * from document_details where user_service_id = ? and type = 'property' and data_type = 'document' and document_from = 'client'`, [responseDic.id])

    if(getPropertyDocs.error || getPropertyDocs.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    responseDic.property_documents = getPropertyDocs.result;

    const getAdminDocs = await mysqlPool.queryWithValues(`select * from document_details where user_service_id = ? and data_type = 'document' and document_from = 'admin'`, [responseDic.id])

    if(getAdminDocs.error || getAdminDocs.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    responseDic.admin_documents = getAdminDocs.result;

    const getUserDetails = await mysqlPool.queryWithValues(`select * from document_details where user_service_id = ? and data_type = 'text' and document_from = 'client'`, [responseDic.id])

    if(getUserDetails.error || getUserDetails.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    responseDic.user_details = getUserDetails.result;

    if(responseDic.service_provider_id) {
      const getServiceProviderUserDetails = await mysqlPool.queryWithValues(`select * from user where id = ?`, [responseDic.service_provider_id])

      if(getServiceProviderUserDetails.error || getServiceProviderUserDetails.result === undefined) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
  
      if(getServiceProviderUserDetails.result.length > 0) {
        responseDic.service_provider = getServiceProviderUserDetails.result[0];
      } else {
        responseDic.service_provider = null
      }
    } else {
      responseDic.service_provider = null
    }
    
    if(responseDic.status === "COMPLETED") {
      const getReview = await mysqlPool.queryWithValues(`select * from review where user_service_id = ?`, [responseDic.id])

      if(getReview.error || getReview.result === undefined) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
  
      if(getReview.result.length > 0) {
        responseDic.review = getReview.result[0];
      } else {
        responseDic.review = null
      }
    } else {
      responseDic.review = null
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseDic));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Upload user documents from admin===================================================
exports.userDocuments = async (req, res) => {
  try {
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;
    
    var data = {};
    data.property_id = '';
    data.service_id = service_id;
    data.sub_service_id = sub_service_id;
    data.user_service_id = user_service_id;
    data.from = 'admin';
    data.title = '';
    data.type = 'user';
    data.data_type = 'document';

    await sharedModule.documents(req, res, data, constant.s3BucketDocuments);
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, "s"));
  }
};

// ========================================Delete user documents from admin===================================================
exports.deleteUserDocuments = async (req, res) => {
  try {
    const document_id = req.params.document_id

    var newReq = req;
    newReq.body = {
      ids: [document_id]
    }
    await sharedModule.deleteDocuments(newReq, res, constant.s3BucketDocuments); 
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Edit user documents===================================================
exports.editUserDocuments = async (req, res) => {
  try {
    await sharedModule.editDocuments(req, res, constant.s3BucketDocuments);
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, "s"));
  }
};

// ========================================Edit user details===================================================
exports.editUserDetails = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const user_service_id = req.params.user_service_id;
    
    const data = req.body;

    if(!data) {
      res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!autToken || autToken === "" || autToken === null) {
      return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }
    
    var ids = [];
    var count = Object.entries(data).length;

    for (const [key, value] of Object.entries(data)) {

      ids.push(key);

      const updateUserDetails = await mysqlPool.queryWithValues('Update document_details set title = ?, content = ?, updated_at = ? where id = ?', [value.title, value.value, util.currentTimestamp(), key]);

      if(updateUserDetails.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }

      count = count - 1;

      if(count === 0) {
        const getAddedDetails = await mysqlPool.queryWithValues('select * from document_details where id in (?)', [ids])

        if(getAddedDetails.error || getAddedDetails.result === undefined || getAddedDetails.result.length === 0) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }
    
        res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getAddedDetails.result));
      }
    }

  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};