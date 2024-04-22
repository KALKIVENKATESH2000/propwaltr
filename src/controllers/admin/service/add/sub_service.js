const mysqlPool = require('../../../../helper/mysql')
const util = require('../../../../util/util')
const constant = require('../../../../util/constant')
const authHelper = require('../../../../helper/auth')
const awsHelper = require('../../../../helper/aws')

// ========================================Create sub service===================================================
exports.subService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const {is_main_service, name, info, turn_around_time, plans, amount} = req.body;
    
    if(!service_id || service_id === "" || service_id === null ||
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

    const subServiceId = util.getDBId()
    const databaseValues = [subServiceId, service_id, is_main_service, '', name, info, JSON.stringify(plans), turn_around_time, amount, util.currentTimestamp()];
    const resultSubServiceAdded = await mysqlPool.queryWithValues('INSERT INTO sub_service (`id`, `service_id`, `is_main_service`, `image`,`name`,`info`, `plans`, `turn_around_time`, `amount`, `created_at`) VALUES (?)', [databaseValues]);

    if(resultSubServiceAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const serviceDetails = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [subServiceId])

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var data = serviceDetails.result[0]

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", data));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Upload sub service photos===================================================
exports.subServicePhotos = async (req, res) => {
    try {
      const autToken = req.headers[constant.authorization];
      const service_id = req.params.service_id;
      const files = req.files;

      if(files.length === 0 || service_id === undefined || service_id === null || service_id === "") {
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

      var filesCount = files.length;

       files.forEach(async file => {
        const getExistingSubService = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [file.fieldname])

        if(getExistingSubService.error || getExistingSubService.result === undefined || getExistingSubService.result.length === 0) {
          return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidSubServiceId + file.fieldname, ""));
        } else {
          filesCount = filesCount - 1;
        }

        if(filesCount === 0) {
          var imageUploadCount = files.length

          files.forEach(async file => {
            const result = await this.uploadSubServiceImage(file)
            imageUploadCount = imageUploadCount - 1
    
            if(imageUploadCount === 0) {
                res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
            }
          });
        }
      });
    } catch {
      res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
  };


  exports.uploadSubServiceImage = async (file) => {
    return new Promise(async resolve => {
        const awsResult = await awsHelper.uploadFile(file, constant.s3BucketServiceImages);

        if(awsResult.error || awsResult.result === null || awsResult === undefined || awsResult.result === undefined) {
            resolve('')
            return
        }

        const databaseValues = [awsResult.result, file.fieldname];
        const resultSubServiceImageAdded = await mysqlPool.queryWithValues('UPDATE sub_service set image = ? where id = ?', databaseValues);
    
        if(resultSubServiceImageAdded.error) {
            resolve('')
            return
        }

        resolve(awsResult.result)
    });
}