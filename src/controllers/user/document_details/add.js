const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const sharedModule = require('../../../controllers/shared_modules/document_details')

// ========================================Upload property documents===================================================
exports.propertyDocuments = async (req, res) => {
    try {
      const service_id = req.params.service_id;
      const sub_service_id = req.params.sub_service_id;
      const user_service_id = req.params.user_service_id;

      var data = {};
      data.property_id = '';
      data.service_id = service_id;
      data.sub_service_id = sub_service_id;
      data.user_service_id = user_service_id;
      data.from = 'client';
      data.title = '';
      data.type = 'property';
      data.data_type = 'document';
  
      await sharedModule.documents(req, res, data, constant.s3BucketDocuments);
    } catch {
      res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
  };


// ========================================Upload user documents===================================================
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
    data.from = 'client';
    data.title = '';
    data.type = 'user';
    data.data_type = 'document';

    await sharedModule.documents(req, res, data, constant.s3BucketDocuments);
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Add user details===================================================
exports.userDetails = async (req, res) => {
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
    
    var databaseValues = [];
    var ids = [];
    data.forEach(element => {
      var id = util.getDBId()
      ids.push(id)
      databaseValues.push([id, authResult.id, authResult.id, '', service_id, sub_service_id, user_service_id, 'client', element.title, element.value, 'user', 'text', util.currentTimestamp(), util.currentTimestamp()])
    });

    const addedInDB = await mysqlPool.queryWithValues('INSERT INTO document_details (id, user_id, uploaded_by, property_id, service_id, sub_service_id, user_service_id, document_from, title, content, type, data_type, created_at, updated_at) VALUES ?', [databaseValues]);

    if(addedInDB.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const getAddedDetails = await mysqlPool.queryWithValues('select * from document_details where id in (?)', [ids])

    if(getAddedDetails.error || getAddedDetails.result === undefined || getAddedDetails.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getAddedDetails.result));

  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
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