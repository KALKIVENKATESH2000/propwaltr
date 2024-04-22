const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const sharedModule = require('../../../controllers/shared_modules/document_details')

// ========================================Delete property documents===================================================
exports.deleteDocuments = async (req, res) => {
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

// ========================================Mark documents as read===================================================
exports.markDocumentRead = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const document_ids = req.body.document_ids;

    if(!document_ids || document_ids.length === 0) {
      res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
      return;
    }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const result = await mysqlPool.queryWithValues('update document_details set is_read = 1 where id in (?)', [document_ids])

    if(result.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
    
    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};