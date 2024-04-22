const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')


// ========================================Get properties===================================================
exports.get = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const propertiesResult = await mysqlPool.queryWithValues(`select property.*, GROUP_CONCAT(photo.image) as images, GROUP_CONCAT(photo.id) as image_ids from property LEFT JOIN property_photo photo ON photo.property_id = property.id where property.user_id = ? GROUP BY property.id ORDER BY property.created_at DESC LIMIT ? OFFSET ?`, [authResult.id, pageSize, offset])

    if(propertiesResult.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, propertiesResult));
    }

    var properties = propertiesResult.result;

    for (let index = 0; index < properties.length; index++) {
      const property = properties[index];
      if(property.images) {
        const photos = property.images.split(',');
        const photoIds = property.image_ids.split(',');
        properties[index].photos = []

        for (let photoIndex = 0; photoIndex < photos.length; photoIndex++) {
          properties[index].photos.push({
            id: photoIds[photoIndex],
            image: photos[photoIndex]
          })
        }

        delete properties[index].images
        delete properties[index].image_ids
      } else {
        properties[index].photos = []
      }
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", properties));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Get property by id===================================================
exports.getPropertyById = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const property_id = req.params.property_id;

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

    const propertiesResult = await mysqlPool.queryWithValues(`select property.*, GROUP_CONCAT(photo.image) as images, GROUP_CONCAT(photo.id) as image_ids from property LEFT JOIN property_photo photo ON photo.property_id = property.id where property.id = ? GROUP BY property.id`, [property_id])

    if(propertiesResult.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, propertiesResult));
    }

    var properties = propertiesResult.result;

    for (let index = 0; index < properties.length; index++) {
      const property = properties[index];
      if(property.images) {
        const photos = property.images.split(',');
        const photoIds = property.image_ids.split(',');
        properties[index].photos = []

        for (let photoIndex = 0; photoIndex < photos.length; photoIndex++) {
          properties[index].photos.push({
            id: photoIds[photoIndex],
            image: photos[photoIndex]
          })
        }

        delete properties[index].images
        delete properties[index].image_ids
      } else {
        properties[index].photos = []
      }
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", properties[0]));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};
