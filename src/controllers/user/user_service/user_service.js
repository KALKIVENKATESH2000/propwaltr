const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')


// ========================================Get all user services===================================================
exports.userService = async (req, res) => {
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

    const search = req.query.search
    let whereClause = ''

    if (search && search.trim() !== '') {
      whereClause = ` and (name LIKE '%${search}%' OR sub_service_name LIKE '%${search}%')`
    }

    var allowedStatus = ''

    if(status === 'new') {
      allowedStatus = `('NEW','REQUEST','ACCEPTED','WAITING')`;
    } else if(status === 'ongoing') {
      allowedStatus = `('REJECT','DISPUTE','COMPLETED_REQUEST','${status}')`;
    } else {
      allowedStatus = `('${status}')`;
    }

    let sql = `SELECT user_service.*, property.*, sub_service.*, service.*
    FROM user_service 
    
    LEFT JOIN (
      SELECT property.id AS property_id, type, width, length, area_size, area_size_unit, lattitude, longitude, name AS property_name, address, landmark, city, state, zip_code
      FROM property
      ORDER BY property_id
    ) AS property ON property.property_id = user_service.property_id

    LEFT JOIN (
      SELECT sub_service.id AS sub_service_id, sub_service.image AS sub_service_image, sub_service.name AS sub_service_name, sub_service.info AS sub_service_info
      FROM sub_service
    ) AS sub_service ON sub_service.sub_service_id = user_service.sub_service_id

    LEFT JOIN (
      SELECT service.id AS service_id, name, image, info
      FROM service
      ORDER BY service_id
    ) AS service ON service.service_id = user_service.service_id

    where (user_id = ? and user_service.status in ${allowedStatus} ${whereClause}) LIMIT ? OFFSET ?`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [authResult.id, pageSize, offset]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    var responseArr = []

    serviceDetails.result.forEach(item => {
      var dic = {
        service: {
          id:item.service_id,
          name:item.name,
          image:item.image,
          info:item.info
        }, 
        sub_service: {
          id:item.sub_service_id,
          name:item.sub_service_name,
          image:item.sub_service_image,
          info:item.sub_service_info
        },
        property: {
          id: item.property_id,
          type: item.type,
          width: item.width,
          length: item.length,
          area_size: item.area_size,
          area_size_unit: item.area_size_unit,
          lattitude: item.lattitude,
          longitude: item.longitude,
          name: item.property_name,
          address: item.address,
          landmark: item.landmark,
          city: item.city,
          state: item.state,
          zip_code: item.zip_code
        }
      }

      delete item.name
      delete item.image
      delete item.info

      delete item.sub_service_name
      delete item.sub_service_image
      delete item.sub_service_info

      delete item.type
      delete item.area_size_unit
      delete item.width
      delete item.length
      delete item.area_size
      delete item.lattitude
      delete item.longitude
      delete item.property_name
      delete item.address
      delete item.landmark
      delete item.city
      delete item.state
      delete item.zip_code

      responseArr.push(Object.assign({}, dic, item));
    });

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseArr));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};