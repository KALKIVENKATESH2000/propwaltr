const mysqlPool = require('../../helper/mysql')
const util = require('../../util/util')
const constant = require('../../util/constant')
const authHelper = require('../../helper/auth')
const awsHelper = require('../../helper/aws')

// ========================================Upload new documents===================================================
exports.documents = async (req, res, data, bucket) => {
  try {
    const autToken = req.headers[constant.authorization];
    const files = req.files;

    if(!files || files.length === 0 ) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    var user_id = authResult.id;

    if(data.user_service_id && data.user_service_id != '') {
      const getUserService = await mysqlPool.queryWithValues('select * from user_service where id = ?', [data.user_service_id])

      if(getUserService.error || getUserService.result === undefined || getUserService.result.length === 0) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
      
      user_id = getUserService.result[0].user_id;
    }

    var uploadCount = files.length
    var addedIds = [];
    files.forEach(async file => {
      const result = await uploadFileToS3(file, data, user_id, authResult.id, bucket)
      addedIds.push(result)
      uploadCount = uploadCount - 1

      if(uploadCount === 0) {
        const getUploadedDocs = await mysqlPool.queryWithValues('select * from document_details where id in (?)', [(addedIds)])

        res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getUploadedDocs.result));
      }
    });
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, "s"));
  }
};

// ========================================Edit Uploaded documents===================================================
exports.editDocuments = async (req, res, bucket) => {
  try {
    const autToken = req.headers[constant.authorization];
    const files = req.files;

    if(!files || files.length === 0 ) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    var uploadCount = files.length
    var addedIds = [];

    files.forEach(async file => {
      const result = await editUploadFileToS3(file, bucket)
      addedIds.push(result)
      uploadCount = uploadCount - 1

      if(uploadCount === 0) {
        const getUploadedDocs = await mysqlPool.queryWithValues('select * from document_details where id in (?)', [(addedIds)])

        res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getUploadedDocs.result));
      }
    });
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, "s"));
  }
};


// ========================================Delete Uploaded documents===================================================
exports.deleteDocuments = async (req, res, bucket) => {
  try {
    const autToken = req.headers[constant.authorization];
    const ids = req.body.ids;

    if(!ids || ids.length === 0) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getUploadedDocs = await mysqlPool.queryWithValues('select content from document_details where id in (?)', [(ids)])
      
    if(getUploadedDocs.result) {
      var uploadedDocs = []
      getUploadedDocs.result.forEach(element => {
        uploadedDocs.push(element.content)
      });

      await awsHelper.deleteFile(uploadedDocs, bucket)
    }

    const deleteDocs = await mysqlPool.queryWithValues('delete from document_details where id in (?)', [(ids)])

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

function uploadFileToS3(file, data, user_id, uploaded_by_id, bucket) {
  return new Promise(async resolve => {
    const awsResult = await awsHelper.uploadFile(file, bucket);

    if(awsResult.error || awsResult.result === null || awsResult === undefined || awsResult.result === undefined) {
        resolve('')
        return
    }

    const id = util.getDBId()
    const title = data.title ? data.title : file.fieldname ? file.fieldname : file.originalname;
    const databaseValues = [id, user_id, uploaded_by_id, data.property_id, data.service_id, data.sub_service_id, data.user_service_id, data.from, title, awsResult.result, file.mimetype, data.type, data.data_type, util.currentTimestamp(), util.currentTimestamp()];
    const addedInDB = await mysqlPool.queryWithValues('INSERT INTO document_details (id, user_id, uploaded_by, property_id, service_id, sub_service_id, user_service_id, document_from, title, content, mime_type, type, data_type, created_at, updated_at) VALUES (?)', [databaseValues]);

    if(addedInDB.error) {
        resolve('')
        return
    }

    resolve(id)
  });
}

function editUploadFileToS3(file, bucket) {
  return new Promise(async resolve => {
    const getExisting = await mysqlPool.queryWithValues('select content from document_details where id = ?', [file.fieldname])
      
    if(getExisting.result) {
      var uploadedDocs = []
      getExisting.result.forEach(element => {
        uploadedDocs.push(element.content)
      });

      await awsHelper.deleteFile(uploadedDocs, bucket)
    }
      
    const awsResult = await awsHelper.uploadFile(file, bucket);

      if(awsResult.error || awsResult.result === null || awsResult === undefined || awsResult.result === undefined) {
          resolve('')
          return
      }
      const databaseValues = [awsResult.result, util.currentTimestamp(), file.fieldname];
      const addedInDB = await mysqlPool.queryWithValues('update document_details set content = ?, updated_at = ? where id = ?', databaseValues);

      if(addedInDB.error) {
          resolve('')
          return
      }

      resolve(file.fieldname)
  });
}
