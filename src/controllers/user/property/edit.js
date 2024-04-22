const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const awsHelper = require('../../../helper/aws')
const sharedModule = require('../../../controllers/shared_modules/document_details')

// ========================================Edit property===================================================
exports.edit = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const {zip_code, state, city, landmark, address, name, type, longitude, lattitude, area_size, area_size_unit, is_own, width, length} = req.body;
    const property_id = req.params.property_id;

    if(!zip_code || zip_code === "" || zip_code === null ||
    !state || state === "" || state === null ||
    !city || city === "" || city === null ||
    !landmark || landmark === "" || landmark === null ||
    !address || address === "" || address === null ||
    !name || name === "" || name === null ||
    !longitude || longitude === "" || longitude === null ||
     !lattitude || lattitude === "" || lattitude === null ||
     !area_size || area_size === "" || area_size === null ||
     !width || width === "" || width === null ||
     !length || length === "" || length === null ||
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

    const getExisting = await mysqlPool.queryWithValues('select * from property where id = ? and user_id = ?', [property_id, authResult.id])

    if(getExisting.error || getExisting.result === undefined || getExisting.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidPropertyId + property_id, ""));
    }

    const databaseValues = [type, width, length, area_size, area_size_unit, lattitude, longitude, name, address, landmark, city, state, zip_code, is_own, util.currentTimestamp(), property_id];
    const resultEdited = await mysqlPool.queryWithValues('update property set `type` = ?, `width` = ?, `length`= ?, `area_size` = ?,`area_size_unit` = ?, `lattitude` = ?, `longitude` = ?, `name` = ?, `address` = ?, `landmark` = ?, `city` = ?, `state` = ?, `zip_code` = ?, `is_own` = ?, `updated_at` = ? where id = ?', databaseValues);

    if(resultEdited.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const details = await mysqlPool.queryWithValues('select * from property where id = ?', [property_id])

    if(details.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var data = details.result[0]

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", data));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Edit Uploaded property photos===================================================
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
      const result = await this.uploadPropertyImage(file)
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


exports.uploadPropertyImage = async (file) => {
  return new Promise(async resolve => {
    const getExisting = await mysqlPool.queryWithValues('select image from property_photo where id = ?', [file.fieldname])
      
    if(getExisting.result) {
      var uploadedImages = []
      getExisting.result.forEach(element => {
        uploadedImages.push(element.image)
      });

      await awsHelper.deleteFile(uploadedImages, constant.s3BucketPropertyImages)
    }
      
    const awsResult = await awsHelper.uploadFile(file, constant.s3BucketPropertyImages);

      if(awsResult.error || awsResult.result === null || awsResult === undefined || awsResult.result === undefined) {
          resolve('')
          return
      }

      const databaseValues = [awsResult.result, util.currentTimestamp(), file.fieldname];
      const imageAdded = await mysqlPool.queryWithValues('update property_photo set image = ?, updated_at = ? where id = ?', databaseValues);

      if(imageAdded.error) {
          resolve('')
          return
      }

      resolve(file.fieldname)
  });
}

// ========================================Delete Uploaded property photos===================================================
exports.deletePhotos = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const property_id = req.params.property_id;
    const photo_ids = req.body.photo_ids;

    if(photo_ids.length === 0 || property_id === undefined || property_id === null || property_id === "") {
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

    const getUploadedPhotos = await mysqlPool.queryWithValues('select image from property_photo where id in (?)', [(photo_ids)])
      
    if(getUploadedPhotos.result) {
      var uploadedImages = []
      getUploadedPhotos.result.forEach(element => {
        uploadedImages.push(element.image)
      });

      await awsHelper.deleteFile(uploadedImages, constant.s3BucketPropertyImages)
    }

    const deletePhotos = await mysqlPool.queryWithValues('delete from property_photo where id in (?)', [(photo_ids)])

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Edit Uploaded property documents===================================================
exports.documents = async (req, res) => {
  try {
    const authToken = req.headers[constant.authorization];
    const property_id = req.params.property_id;

    if(property_id === undefined || property_id === null || property_id === "") {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!authToken || authToken === "" || authToken === null) {
      return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(authToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExisting = await mysqlPool.queryWithValues('select * from property where id = ? and user_id = ?', [property_id, authResult.id])

    if(getExisting.error || getExisting.result === undefined || getExisting.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidPropertyId + property_id, ""));
    }

    await sharedModule.editDocuments(req, res, constant.s3BucketDocuments);
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Delete Uploaded property documents===================================================
exports.deleteDocuments = async (req, res) => {
  try {
    const authToken = req.headers[constant.authorization];
    const property_id = req.params.property_id;

    if(property_id === undefined || property_id === null || property_id === "") {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    if(!authToken || authToken === "" || authToken === null) {
      return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(authToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExisting = await mysqlPool.queryWithValues('select * from property where id = ? and user_id = ?', [property_id, authResult.id])

    if(getExisting.error || getExisting.result === undefined || getExisting.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidPropertyId + property_id, ""));
    }

    await sharedModule.deleteDocuments(req, res, constant.s3BucketDocuments); 
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};