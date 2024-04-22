const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')

// ========================================Get top header===================================================
exports.topHeader = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const result = await mysqlPool.query(`select service_id, count(service_id) as count from user_service where status = 'COMPLETED' group by service_id order by count DESC`)

    if(result.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    let topServicesIds = [];

    result.result.forEach(element => {
        if(topServicesIds.length < 3) {
          topServicesIds.push(element.service_id);
        }
    });

    const topServices = await mysqlPool.queryWithValues(`select * from service where (is_deleted = 0 and id in (?))`, [topServicesIds])

    if(topServices.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, topServices));
    }

    const topCoupon = await mysqlPool.query(`select * from coupon where (type = 'UNIVERSAL' and status = 'ACTIVE') order by created_at DESC LIMIT 3`)

    if(topCoupon.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, topCoupon));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", {
      topServices: topServices.result,
      topCoupons: topCoupon.result,
    }));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get all offers===================================================
exports.offers = async (req, res) => {
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

    const result = await mysqlPool.queryWithValues(`select * from coupon where status = 'ACTIVE' and type = 'UNIVERSAL' ORDER BY created_at DESC LIMIT ? OFFSET ?`, [pageSize, offset])

    if(result.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", result.result));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get all services===================================================
exports.services = async (req, res) => {
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
  
      const result = await mysqlPool.queryWithValues(`select * from service where is_deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?`, [pageSize, offset])
  
      if(result.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
  
      var services = []

      await Promise.all(
        result.result.map(async item => {
          var service = item
  
          let sql = `SELECT AVG(rating) as rating FROM review where service_id = ?`;
  
          var rating = await mysqlPool.queryWithValues(sql, [service.id]);
  
          if(rating.error) {
            return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
          }
          
          service.rating = Number((rating.result[0].rating || 0).toFixed(2));

          services.push(service);
        })
      )

      res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", services));
    } catch {
      res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
};


// ========================================Get all requested services===================================================
exports.requestedServices = async (req, res) => {
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
  
      var query = `select * from user_service where user_id = ? and status != '' ORDER BY created_at DESC LIMIT ? OFFSET ?`
  
      const result = await mysqlPool.queryWithValues(query, [authResult.id, pageSize, offset])
  
      if(result.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, result));
      }
  
      var responseArr = []
  
      for (let index = 0; index < result.result.length; index++) {
        let element = result.result[index];
        
        const service = await mysqlPool.queryWithValues('select * from service where id = ?', [element.service_id])

        if(service.result && service.result.length > 0) {
          element.service = service.result[0];
        } else {
          element.service = null;
        }

        const property = await mysqlPool.queryWithValues('select * from property where id = ?', [element.property_id])

        if(property.result && property.result.length > 0) {
          element.property = property.result[0];
        } else {
          element.property = null;
        }


        const sub_service = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [element.sub_service_id])

        if(sub_service.result && sub_service.result.length > 0) {
          element.sub_service = sub_service.result[0];
        } else {
          element.sub_service = null;
        }

        responseArr.push(element)
      }
  
      res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseArr));
    } catch {
      res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
};

// ========================================Get all requested services===================================================
exports.homeSearch = async (req, res) => {
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

      //Services search
      let whereClauseForService = ''

      if (search && search.trim() !== '') {
        whereClauseForService = ` and name LIKE '%${search}%'`
      }

      const serviceResult = await mysqlPool.queryWithValues(`select * from service where (is_deleted = 0${whereClauseForService}) ORDER BY created_at DESC LIMIT ? OFFSET ?`, [pageSize, offset])
  
      if(serviceResult.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceResult));
      }

      //Requested services search
      let whereClauseForRequestedService = ''

      if (search && search.trim() !== '') {
        whereClauseForRequestedService = `and (service.name LIKE '%${search}%' OR service.info LIKE '%${search}%' OR property.property_name LIKE '%${search}%') `
      }
      
      var query = `select user_service.*, service.*, property.*
    
      from user_service 
      
      LEFT JOIN (
        SELECT service.id AS service_id, name, image, info
        FROM service
        ORDER BY service_id
      ) AS service ON service.service_id = user_service.service_id

      LEFT JOIN (
        SELECT property.id AS property_id, type, width, length, area_size, area_size_unit, lattitude, longitude, name AS property_name, address, landmark, city, state, zip_code
        FROM property
        ORDER BY property_id
      ) AS property ON property.property_id = user_service.property_id

      where user_service.user_id = ?${whereClauseForRequestedService} ORDER BY user_service.created_at DESC LIMIT ? OFFSET ?`
  
      const requestedServicesResult = await mysqlPool.queryWithValues(query, [authResult.id, pageSize, offset])
  
      if(requestedServicesResult.error) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
  
      var responseArr = []
  
      requestedServicesResult.result.forEach(item => {
        var dic = {
          service: {
            id: item.service_id,
            image: item.image,
            name: item.name,
            info: item.info,
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
  
        delete item.image
        delete item.name
        delete item.info
  
        delete item.property_id
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
  
      var services = []

      await Promise.all(
        serviceResult.result.map(async item => {
          var service = item
  
          let sql = `SELECT AVG(rating) as rating FROM review where service_id = ?`;
  
          var rating = await mysqlPool.queryWithValues(sql, [service.id]);
  
          if(rating.error) {
            return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
          }
          
          service.rating = Number((rating.result[0].rating || 0).toFixed(2));

          services.push(service);
        })
      )

      res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", {
        services: services,
        requested_services: responseArr,
        properties:[]
      }));
    } catch {
      res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }
};