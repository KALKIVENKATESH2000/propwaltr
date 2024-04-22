const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const awsHelper = require('../../../helper/aws')
const sharedModule = require('../../../controllers/shared_modules/document_details')

// ========================================Create new property===================================================
exports.add = async (req, res) => {
  try { 
    const autToken = req.headers[constant.authorization];
    const { zip_code, state, city, landmark, address, name, type, longitude, lattitude, area_size, area_size_unit, is_own, width, length } = req.body;

    if(!zip_code || zip_code === "" || zip_code === null ||
    !state || state === "" || state === null ||
    !city || city === "" || city === null ||
    !landmark || landmark === "" || landmark === null ||
    !address || address === "" || address === null ||
    !name || name === "" || name === null ||
    !longitude || longitude === "" || longitude === null ||
     !lattitude || lattitude === "" || lattitude === null ||
     !width || width === "" || width === null ||
     !length || length === "" || length === null ||
     !area_size || area_size === "" || area_size === null ||
     !area_size_unit || area_size_unit === "" || area_size_unit === null ||
     !type || type === "" || type === null ||
     is_own === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const id = util.getDBId()
    const databaseValues = [id, authResult.id, type, width, length, area_size, area_size_unit, lattitude, longitude, name, address, landmark, city, state, zip_code, is_own, util.currentTimestamp(), util.currentTimestamp()];
    const resultAdded = await mysqlPool.queryWithValues('INSERT INTO property (id, user_id, type, width, length, area_size, area_size_unit, lattitude, longitude, name, address, landmark, city, state, zip_code, is_own, created_at, updated_at) VALUES (?)', [databaseValues]);

    if(resultAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const details = await mysqlPool.queryWithValues('select * from property where id = ?', [id])

    if(details.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var data = details.result[0]

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", data));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Upload property photos===================================================
exports.photos = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const property_id = req.params.property_id;
    const files = req.files;

    if(files === undefined || files.length === 0 || property_id === undefined || property_id === null || property_id === "") {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExisting = await mysqlPool.queryWithValues('select * from property where id = ? and user_id = ?', [property_id, authResult.id])

    if(getExisting.error || getExisting.result === undefined || getExisting.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidPropertyId + property_id, ""));
    }

    var imageUploadCount = files.length
    var addedIds = [];
    files.forEach(async file => {
      const result = await this.uploadPropertyImage(property_id, file)
      addedIds.push(result)
      imageUploadCount = imageUploadCount - 1

      if(imageUploadCount === 0) {
        const getUploaded = await mysqlPool.queryWithValues('select * from property_photo where id in (?)', [(addedIds)])
        res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getUploaded.result));
      }
    });
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


exports.uploadPropertyImage = async (property_id, file) => {
  return new Promise(async resolve => {
      const awsResult = await awsHelper.uploadFile(file, constant.s3BucketPropertyImages);

      if(awsResult.error || awsResult.result === null || awsResult === undefined || awsResult.result === undefined) {
          resolve('')
          return
      }

      const id = util.getDBId()
      const databaseValues = [id, property_id, awsResult.result, util.currentTimestamp(), util.currentTimestamp()];
      const imageAdded = await mysqlPool.queryWithValues('INSERT INTO property_photo (id, property_id, image, created_at, updated_at) VALUES (?);', [databaseValues]);

      if(imageAdded.error) {
          resolve('')
          return
      }

      resolve(id)
  });
}


// ========================================Upload property documents===================================================
exports.documents = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const property_id = req.params.property_id;
    var data = {};

    if(property_id === undefined || property_id === null || property_id === "") {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!autToken || autToken === "" || autToken === null) {
      return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExisting = await mysqlPool.queryWithValues('select * from property where id = ? and user_id = ?', [property_id, authResult.id])

    if(getExisting.error || getExisting.result === undefined || getExisting.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidPropertyId + property_id, ""));
    }

    data.property_id = property_id;
    data.service_id = '';
    data.sub_service_id = '';
    data.user_service_id = '';
    data.from = 'client';
    data.title = '';
    data.type = 'property';
    data.data_type = 'document';

    await sharedModule.documents(req, res, data, constant.s3BucketDocuments);
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};