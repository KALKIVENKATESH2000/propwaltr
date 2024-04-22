const mysqlPool = require('../../../../helper/mysql')
const util = require('../../../../util/util')
const constant = require('../../../../util/constant')
const authHelper = require('../../../../helper/auth')

// ========================================Get all sub services===================================================
exports.subService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;
    const service_id = req.params.service_id;

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

    let sql = `SELECT * FROM sub_service where service_id = ? LIMIT ? OFFSET ?`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [service_id, pageSize, offset]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", serviceDetails.result));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get all user services===================================================
exports.userService = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;
    const status = req.params.status;

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

    const getExistingSubService = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [sub_service_id])

    if(getExistingSubService.error || getExistingSubService.result === undefined || getExistingSubService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidSubServiceId + sub_service_id, ""));
    }

    const search = req.query.search
    let whereClause = ''

    if (search && search.trim() !== '') {
      whereClause = ` and (user.first_name LIKE '%${search}%' OR user.last_name LIKE '%${search}%' OR user.email LIKE '%${search}%' OR user.phone LIKE '%${search}%')`
    }

    var allowedStatus = ''

    if(status === 'new') {
      allowedStatus = '("REQUEST","ACCEPTED","WAITING")';
    } else if(status === 'ongoing') {
      allowedStatus = '("COMPLETED_REQUEST", "reject", "completed_request", "dispute")';
    }

    let sql = `SELECT user_service.*, user.*, client_info.*, property.*, service_provider_user.*
    FROM user_service 
    
    LEFT JOIN (
      SELECT id AS user_id, first_name, last_name, email, phone, profile_picture
      FROM user
    ) AS user ON user.user_id = user_service.user_id

    LEFT JOIN (
      SELECT user_id, address, landmark, city, state, zip_code
      FROM client_info
    ) AS client_info ON client_info.user_id = user_service.user_id

    LEFT JOIN (
      SELECT property.id AS property_id, type, width, length, area_size, area_size_unit, lattitude, longitude, name AS property_name, address, landmark, city, state, zip_code
      FROM property
      ORDER BY property_id
    ) AS property ON property.property_id = user_service.property_id
    
    LEFT JOIN (
      SELECT id AS service_provider_user_id, first_name as service_provider_user_first_name, last_name as service_provider_user_last_name, email as service_provider_user_email, phone as service_provider_user_phone, profile_picture as service_provider_user_profile_picture
      FROM user
    ) AS service_provider_user ON service_provider_user.service_provider_user_id = user_service.service_provider_id

    where (user_service.service_id = ? and user_service.sub_service_id = ? and (user_service.status = ? ${allowedStatus != '' ? `or user_service.status in ${allowedStatus}` : ''}))${whereClause} LIMIT ? OFFSET ?`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [service_id, sub_service_id, status, pageSize, offset]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    var responseArr = []

    serviceDetails.result.forEach(item => {
      var dic = {
        user: {
          profile_picture: item.profile_picture,
          id: item.user_id,
          first_name: item.first_name,
          last_name: item.last_name,
          email: item.email,
          phone: item.phone,
          address: {
            address: item.address,
            landmark: item.landmark,
            city: item.city,
            state: item.state,
            zip_code: item.zip_code
          }
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
        },
        service_provider: {
          profile_picture: item.service_provider_user_profile_picture,
          id: item.service_provider_user_user_id,
          first_name: item.service_provider_user_first_name,
          last_name: item.service_provider_user_last_name,
          email: item.service_provider_user_email,
          phone: item.service_provider_user_phone
        },
      }

      delete item.service_provider_user_profile_picture
      delete item.service_provider_user_user_id
      delete item.service_provider_user_first_name
      delete item.service_provider_user_last_name
      delete item.service_provider_user_email
      delete item.service_provider_user_phone

      delete item.profile_picture
      delete item.user_id
      delete item.first_name
      delete item.last_name
      delete item.email
      delete item.phone
      delete item.address
      delete item.landmark
      delete item.city
      delete item.state
      delete item.zip_code

      delete item.property_id
      delete item.type
      delete item.width
      delete item.length
      delete item.area_size
      delete item.area_size_unit
      delete item.lattitude
      delete item.longitude
      delete item.property_name
      delete item.address
      delete item.landmark
      delete item.city
      delete item.state
      delete item.zip_code

      delete item.review_id
      delete item.rating
      delete item.comment
      delete item.is_hidden
      delete item.review_created_at
      delete item.review_updated_at
      delete item.user_service_id

      responseArr.push(Object.assign({}, dic, item));
    });

    var services = []

    await Promise.all(
      responseArr.map(async item => {
        var service = item

        let sql = `SELECT * FROM review where user_service_id = ?`;

        var reviews = await mysqlPool.queryWithValues(sql, [service.id]);

        if(reviews.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
        }
        
        service.reviews = reviews.result;

        services.push(service);
      })
    )

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", services));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get service plans===================================================
exports.getServicePlans = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_ids = req.body.sub_service_ids;

    if(!sub_service_ids || sub_service_ids === null || sub_service_ids.length === 0) {
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

    const duration = ["monthly", "quarterly", "half_yearly", "yearly"]
    var responsePush = {}
    var subServiceCounts = sub_service_ids.length;

    sub_service_ids.forEach(sub_service_id => {
      var responseDic = {}
      var durationCounts = duration.length;

      duration.forEach(async element => {
        const getExistingServicePlans = await mysqlPool.queryWithValues('select * from razorpay_plan where sub_service_id = ? and plan_duration = ? and is_disabled = 0 ORDER BY version_no DESC', [sub_service_id, element])

        if(getExistingServicePlans.error || getExistingServicePlans.result === undefined) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(getExistingServicePlans, constant.responseMessageInternalServerError, ""));
        }

        const result = getExistingServicePlans.result
        responseDic[element.toUpperCase()] = []

        result.forEach(data => {
          if(responseDic[element.toUpperCase()].some(item => item.plan_frequency === data.plan_frequency) === false) {
            responseDic[element.toUpperCase()].push(data);
          }
        });

        durationCounts = durationCounts - 1

        if(durationCounts === 0) {
          subServiceCounts = subServiceCounts - 1
          responsePush[sub_service_id] = responseDic;

          if(subServiceCounts === 0) {
            res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responsePush));
          }
        }
      });
    });
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};