const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')


// ========================================Get dispute===================================================
exports.get = async (req, res) => {
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
    
    var whereClause = ''
    
    if (status !== 'all') {
        whereClause = ` where status = "${status}"`
    }

    const result = await mysqlPool.queryWithValues(`select dispute.*, thread.thread_id, user.*, service.*, sub_service.* from dispute
    
    LEFT JOIN (
      SELECT dispute_id, admin_id, id as thread_id
      FROM thread
    ) AS thread ON thread.dispute_id = dispute.id

    LEFT JOIN (
      SELECT id AS user_id, first_name, last_name, email, phone, profile_picture
      FROM user
    ) AS user ON user.user_id = dispute.client_id

    LEFT JOIN (
      SELECT id AS service_id, image, name, info
      FROM service
    ) AS service ON service.service_id = dispute.service_id

    LEFT JOIN (
      SELECT id AS sub_service_id, image AS sub_service_image, name AS sub_service_name, info AS sub_service_info
      FROM sub_service
    ) AS sub_service ON sub_service.sub_service_id = dispute.sub_service_id

    ${whereClause} ORDER BY dispute.created_at DESC LIMIT ? OFFSET ?`, [pageSize, offset])

    if(result.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, result));
    }

    var responseArr = []


    if(result.result.length === 0) {
      res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseArr));
    }
    
    result.result.forEach(async item => {
      var dic = {
        user: {
          id: item.user_id,
          first_name: item.first_name,
          last_name: item.last_name,
          profile_picture: item.profile_picture,
          email: item.email,
          phone: item.phone,
        },
        service: {
          id: item.service_id,
          image: item.image,
          name: item.name,
          info: item.info,
        },
        sub_service: {
          id: item.sub_service_id,
          image: item.sub_service_image,
          name: item.sub_service_name,
          info: item.sub_service_info,
        },
      }

      const getUserService = await mysqlPool.queryWithValues('select * from user_service where id = ?', [item.user_service_id])

      if(getUserService.error || getUserService.result === undefined) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
  
      dic.user_service = getUserService.result.length > 0 ? getUserService.result[0] : null;

      if(dic.user_service) {
        const getProperty = await mysqlPool.queryWithValues('select * from property where id = ?', [dic.user_service.property_id])

        if(getProperty.error || getProperty.result === undefined || getProperty.result.length === 0) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }
    
        dic.property = getProperty.result[0]
      } else {
        dic.property = null
      }

      delete item.profile_picture
      delete item.user_id
      delete item.first_name
      delete item.last_name
      delete item.email
      delete item.phone
      
      delete item.service_id
      delete item.image
      delete item.info
      delete item.name

      delete item.sub_service_id
      delete item.sub_service_image
      delete item.sub_service_name
      delete item.sub_service_info

      responseArr.push(Object.assign({}, dic, item));

      if(responseArr.length === result.result.length) {
        res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseArr));
      }
    });
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};
