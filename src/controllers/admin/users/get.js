const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')

// ========================================Get all users===================================================
exports.clientUsers = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;
    const filter = req.params.filter;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const search = req.query.search
    let whereClause = ''

    if(filter === "blocked") {
      whereClause = ` and is_blocked = 1`
    }
    
    if(filter === "unblocked") {
      whereClause = ` and is_blocked = 0`
    }

    if (search && search.trim() !== '') {
      whereClause = whereClause + ` and (user.first_name LIKE '%${search}%' OR user.last_name LIKE '%${search}%' OR user.email LIKE '%${search}%' OR user.phone LIKE '%${search}%')`
    }

    let sql = `SELECT user.*, client_info.*, COALESCE(ongoing_services.count, 0) AS ongoing_services

    FROM user 

    LEFT JOIN (
      SELECT *
      FROM client_info
    ) AS client_info ON client_info.user_id = user.id

    LEFT JOIN (
      SELECT user_id, status, COUNT(*) AS count
      FROM user_service
      WHERE status = "ongoing"
      GROUP BY user_id
    ) AS ongoing_services ON ongoing_services.user_id = user.id

    where user.type = "client"${whereClause} ORDER BY user.created_at DESC LIMIT ? OFFSET ?`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [pageSize, offset]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    var responseArr = []

    serviceDetails.result.forEach(item => {
      var dic = item

      delete dic.user_id
      delete dic.password

      responseArr.push(dic);
    });

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseArr));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get all users===================================================
exports.serviceProvidersUsers = async (req, res) => {
    try {
      const autToken = req.headers[constant.authorization];
      const pageNo = parseInt(req.query.pageNo) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const offset = (pageNo - 1) * pageSize;
      const filter = req.params.filter;

      if(!autToken || autToken === "" || autToken === null) {
          return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
      }
  
      const authResult = await authHelper.verifyJWTToken(autToken);
  
      if(!authResult.status) {
          return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
      }
  
      const search = req.query.search
      let whereClause = ''
  
      if(filter === "blocked") {
        whereClause = ` and is_blocked = 1`
      } else if(filter === "verified") {
        whereClause = ` and is_verified = 1`
      } else if(filter === "unverified") {
        whereClause = ` and is_verified = 0`
      }

      if (search && search.trim() !== '') {
        whereClause = whereClause + ` and (user.first_name LIKE '%${search}%' OR user.last_name LIKE '%${search}%' OR user.email LIKE '%${search}%' OR user.phone LIKE '%${search}%')`
      }
  
      let sql = `SELECT user.*, service_provider_info.*
      FROM user 
  
      LEFT JOIN (
        SELECT *
        FROM service_provider_info
      ) AS service_provider_info ON service_provider_info.user_id = user.id
  
      where user.type = "service_provider"${whereClause} ORDER BY user.created_at DESC LIMIT ? OFFSET ?`;
  
      const serviceDetails = await mysqlPool.queryWithValues(sql, [pageSize, offset]);
  
      if(serviceDetails.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
      }
  
      var responseArr = []

      serviceDetails.result.forEach(item => {
        var dic = item
  
        delete dic.user_id
        delete dic.password
  
        responseArr.push(item);
      });
  
      res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseArr));
    } catch {
      res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
  };


// ========================================Get service provider user details===================================================
exports.serviceProviderDetailsById = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;
    const user_id = req.params.user_id;
    const type = "service_provider"

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExistingUser = await mysqlPool.queryWithValues('select * from user where id = ? and type = ?', [user_id, type])

    if(getExistingUser.error || getExistingUser.result === undefined || getExistingUser.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
    }

    let sql = `SELECT user.*, service_provider_info.*, COALESCE(completed_services.count, 0) AS completed_services, COALESCE(review.count, 0) AS review, review.totalReview AS totalRating
    FROM user 

    LEFT JOIN (
      SELECT *
      FROM service_provider_info
    ) AS service_provider_info ON service_provider_info.user_id = user.id

    LEFT JOIN (
      SELECT service_provider_id, status, COUNT(*) AS count
      FROM user_service
      WHERE status = "completed"
      GROUP BY service_provider_id
    ) AS completed_services ON completed_services.service_provider_id = user.id

    LEFT JOIN (
      SELECT service_provider_id, COUNT(*) AS count, SUM(rating) AS totalReview
      FROM review
      GROUP BY service_provider_id
    ) AS review ON review.service_provider_id = user.id

    where user.id = ? and user.type = "service_provider"`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [user_id, pageSize, offset]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    var responseArr = serviceDetails.result[0]

    delete responseArr.user_id
    delete responseArr.password

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseArr));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get client user details===================================================
exports.clientDetailsById = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const user_id = req.params.user_id;
    const type = "client"

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExistingUser = await mysqlPool.queryWithValues('select * from user where id = ? and type = ?', [user_id, type])

    if(getExistingUser.error || getExistingUser.result === undefined || getExistingUser.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
    }

    const serviceDetails = await mysqlPool.queryWithValues(`SELECT user.*, client_info.*, COALESCE(completed_services.count, 0) AS completed_services, COALESCE(property.count, 0) AS properties
                                                            FROM user 

                                                            LEFT JOIN (
                                                              SELECT user_id, status, COUNT(*) AS count
                                                              FROM user_service
                                                              WHERE status = "completed"
                                                              GROUP BY user_id
                                                            ) AS completed_services ON completed_services.user_id = user.id

                                                            LEFT JOIN (
                                                              SELECT user_id, COUNT(*) AS count
                                                              FROM property
                                                              GROUP BY user_id
                                                            ) AS property ON property.user_id = user.id

                                                            LEFT JOIN (
                                                              SELECT *
                                                              FROM client_info
                                                            ) AS client_info ON client_info.user_id = user.id

                                                            where user.id = ? and user.type = "client"`, [user_id]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const refUserDetails = await mysqlPool.queryWithValues(`SELECT * from client_ref_user where user_id = ?`, [user_id]);

    if(refUserDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var responseArr = serviceDetails.result[0]

    responseArr.ref_user = refUserDetails.result[0]
    
    delete responseArr.user_id
    delete responseArr.password

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseArr));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};