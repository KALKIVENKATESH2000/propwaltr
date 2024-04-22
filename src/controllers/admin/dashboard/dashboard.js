const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')

// ========================================Get all statistics===================================================
exports.statistics = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];

    if(!autToken || autToken === "" || autToken === null) {
      return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const newServicesResult = await mysqlPool.query(`select status, COUNT(*) AS count from user_service where status in ('new', 'accepted', 'waiting')`);
    const ongoingServicesResult = await mysqlPool.query(`select status, COUNT(*) AS count from user_service where status in ('ongoing', 'reject', 'completed_request', 'dispute')`);
    const redFlagResult = await mysqlPool.queryWithValues(`select turn_around_date, COUNT(*) AS count from user_service where DATE(turn_around_date) < ?`, [util.currentDate()]);

    if(newServicesResult.error || ongoingServicesResult.error || redFlagResult.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ''));
    }

    let new_services = 0;
    let ongoing_services = 0;
    let red_flags = 0;
    let revenue = 0;

    if(newServicesResult.result.length > 0) {
      new_services = newServicesResult.result[0].count
    } 

    if(ongoingServicesResult.result.length > 0) {
      ongoing_services = ongoingServicesResult.result[0].count
    } 

    if(redFlagResult.result.length > 0) {
      red_flags = redFlagResult.result[0].count
    } 

    const revenueDetails = await mysqlPool.query('select ROUND(SUM(total_amount)) AS revenue from purchase where status = "SUCCESS"');

    if(revenueDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, revenueDetails));
    }

    if(revenueDetails.result.length > 0) {
      revenue = revenueDetails.result[0].revenue
    } 

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", {
      new_services,
      ongoing_services,
      red_flags,
      revenue,
    }));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get all new requests===================================================
exports.newRequest = async (req, res) => {
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
  
      const search = req.query.search
      let whereClause = ''
  
      if (search && search.trim() !== '') {
        whereClause = ` and (user.first_name LIKE '%${search}%' OR user.last_name LIKE '%${search}%' OR user.email LIKE '%${search}%' OR user.phone LIKE '%${search}%')`
      }
  
      var baseQuery = `SELECT user_service.*, user.*, client_info.*
      FROM user_service 
      
      LEFT JOIN (
        SELECT id AS user_id, first_name, last_name, email, phone, profile_picture
        FROM user
      ) AS user  ON user.user_id = user_service.user_id
  
      LEFT JOIN (
        SELECT user_id, address, landmark, city, state, zip_code
        FROM client_info
      ) AS client_info ON client_info.user_id = user_service.user_id
      
      LEFT JOIN (
        SELECT id AS service_provider_user_id, first_name as service_provider_user_first_name, last_name as service_provider_user_last_name, email as service_provider_user_email, phone as service_provider_user_phone, profile_picture as service_provider_user_profile_picture
        FROM user
      ) AS service_provider_user ON service_provider_user.service_provider_user_id = user_service.service_provider_id

      where user_service.status = 'new'${whereClause}`

      let sql = `${baseQuery} order by user_service.created_at DESC LIMIT ? OFFSET ?`;
  
      const serviceDetails = await mysqlPool.queryWithValues(sql, [pageSize, offset]);
  
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
          service_provider: {
            profile_picture: item.service_provider_user_profile_picture,
            id: item.service_provider_user_user_id,
            first_name: item.service_provider_user_first_name,
            last_name: item.service_provider_user_last_name,
            email: item.service_provider_user_email,
            phone: item.service_provider_user_phone
          }
        }
  
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
  
        delete item.service_provider_user_profile_picture
        delete item.service_provider_user_user_id
        delete item.service_provider_user_first_name
        delete item.service_provider_user_last_name
        delete item.service_provider_user_email
        delete item.service_provider_user_phone

        responseArr.push(Object.assign({}, dic, item));
      });
  

      var requestedServices = []

      for (let index = 0; index < responseArr.length; index++) {
        const service = responseArr[index];
        
        var property = await mysqlPool.queryWithValues(`SELECT * FROM property where id = ?`, [service.property_id]);
  
          if(property.error) {
            return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
          }
  
          if(property.result.length > 0) {
            service.property = property.result[0];
          }

          var subService = await mysqlPool.queryWithValues(`SELECT * FROM sub_service where id = ?`, [service.sub_service_id]);
  
          if(subService.error) {
            return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
          }
  
          if(subService.result.length > 0) {
            service.sub_service = subService.result[0];
          }
  
          var mainServiceDetails = await mysqlPool.queryWithValues(`SELECT * FROM service where id = ?`, [service.service_id]);
  
          if(mainServiceDetails.error) {
            return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
          }
  
          if(serviceDetails.result.length > 0) {
            service.service = mainServiceDetails.result[0];
          }

          var review = await mysqlPool.queryWithValues(`SELECT * FROM review where id = ?`, [service.id]);
  
          if(review.error) {
            return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
          }

          service.reviews = review.result;

          requestedServices.push(service);
      }
  
      var totalCount = await mysqlPool.query(baseQuery);
  
      if(totalCount.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }

      res.status(constant.responseCodeSuccess).json(util.responseJSONWithCounts(true, "", requestedServices, (totalCount.result.length || 0)));
    } catch {
      res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
  };


// ========================================Get all best services===================================================
exports.bestServices = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];

    if(!autToken || autToken === "" || autToken === null) {
      return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    let sql = `
    SELECT
    service.*, COALESCE(requests.count, 0) AS requests_counts

    FROM service
    
    LEFT JOIN (
      SELECT service_id, COUNT(*) AS count
      FROM user_service
      GROUP BY service_id
    ) AS requests ON requests.service_id = service.id
    
    WHERE service.is_deleted = 0

    ORDER BY requests.count DESC LIMIT 3`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, []);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    var counts = serviceDetails.result
    // delete counts.id;

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", counts));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get all lowest services===================================================
exports.lowestServices = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];

    if(!autToken || autToken === "" || autToken === null) {
      return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    let sql = `
    SELECT
    service.*, COALESCE(requests.count, 0) AS requests_counts

    FROM service
    
    LEFT JOIN (
      SELECT service_id, COUNT(*) AS count
      FROM user_service
      GROUP BY service_id
    ) AS requests ON requests.service_id = service.id
    
    WHERE service.is_deleted = 0
    
    ORDER BY requests.count ASC LIMIT 3`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, []);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    var counts = serviceDetails.result
    // delete counts.id;

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", counts));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get service selling===================================================
exports.serviceSelling = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
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

    let sql = `
    SELECT MONTH(created_at) AS month_number, COUNT(DISTINCT id) as request_counts
    FROM user_service
    where service_id = ?
    GROUP BY month_number`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [service_id]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    var counts = serviceDetails.result

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", counts));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get users count===================================================
exports.usersCount = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];

    if(!autToken || autToken === "" || autToken === null) {
      return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const clientCountsResult = await mysqlPool.query(`SELECT MONTH(created_at) AS month_number, COUNT(DISTINCT id) as clients
    FROM user
    where type = "client"
    GROUP BY month_number`);

    if(clientCountsResult.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const serviceProviderCountsResult = await mysqlPool.query(`SELECT MONTH(created_at) AS month_number, COUNT(DISTINCT id) as service_providers
    FROM user
    where type = "service_provider"
    GROUP BY month_number`);

    if(serviceProviderCountsResult.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const todaysClientCountsResult = await mysqlPool.query(`SELECT COUNT(DISTINCT id) as count
    FROM user
    where DATE(created_at) = "` + util.currentDate() + `" and type = "client"`);

    if(todaysClientCountsResult.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const todaysServiceProviderCountsResult = await mysqlPool.query(`SELECT COUNT(DISTINCT id) as count
    FROM user
    where DATE(created_at) = "` + util.currentDate() + `" and type = "service_provider"`);

    if(todaysServiceProviderCountsResult.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var counts = {
      clients: clientCountsResult.result,
      service_providers: serviceProviderCountsResult.result,
      todays: {
        clients: todaysClientCountsResult.error || todaysClientCountsResult.result.length === 0 ? 0 : todaysClientCountsResult.result[0].count,
        service_providers: todaysServiceProviderCountsResult.error || todaysServiceProviderCountsResult.result.length === 0 ? 0 : todaysServiceProviderCountsResult.result[0].count
      }
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", counts));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};