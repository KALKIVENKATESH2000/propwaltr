const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')

// ========================================Get all user properties===================================================
exports.properties = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;
    const user_id = req.params.user_id;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExistingUser = await mysqlPool.queryWithValues('select * from user where id = ?', [user_id])

    if(getExistingUser.error || getExistingUser.result === undefined || getExistingUser.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
    }

    let sql = `SELECT * FROM property where user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [user_id, pageSize, offset]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var responseArr = []
    var counts = 0

    serviceDetails.result.forEach(async item => {
      var dic = {
        address: {
            address: item.address,
            landmark: item.landmark,
            city: item.city,
            state: item.state,
            zip_code: item.zip_code,
            lattitude: item.lattitude,
            longitude: item.longitude
          }
      }

      let propertiesPhotos = `SELECT * FROM property_photo where property_id = ? ORDER BY created_at`;

      const propertiesPhotosResult = await mysqlPool.queryWithValues(propertiesPhotos, [item.id]);
  
      if(propertiesPhotosResult.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }

      dic.photos = propertiesPhotosResult.result;

      let propertiesDocuments = `SELECT * FROM document_details where property_id = ? and document_from = 'client' and type = 'property' and data_type = 'document' ORDER BY created_at`;

      const propertiesDocumentsResult = await mysqlPool.queryWithValues(propertiesDocuments, [item.id]);
  
      if(propertiesDocumentsResult.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }

      dic.documents = propertiesDocumentsResult.result;

      delete item.user_id
      delete item.password
      delete item.address
      delete item.landmark
      delete item.city
      delete item.state
      delete item.zip_code
      delete item.lattitude
      delete item.longitude

      counts = counts + 1;

      responseArr.push(Object.assign({}, dic, item));

      if(counts === serviceDetails.result.length) {
        res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseArr));
      }
    });

  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};