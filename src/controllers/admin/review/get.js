const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')

// ========================================Get all user reviews===================================================
exports.reviews = async (req, res) => {
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

    let sql = `SELECT review.*, user.*, service.*, sub_service.*
    FROM review 
    
    LEFT JOIN (
      SELECT id AS user_id, first_name, last_name, email, phone, profile_picture
      FROM user
    ) AS user ON user.user_id = review.user_id

    LEFT JOIN (
      SELECT id AS service_id, image, name, info
      FROM service
    ) AS service ON service.service_id = review.service_id

    LEFT JOIN (
      SELECT id AS sub_service_id, image AS sub_service_image, name AS sub_service_name, info AS sub_service_info
      FROM sub_service
    ) AS sub_service ON sub_service.sub_service_id = review.sub_service_id

    where review.user_id = ? ORDER BY review.created_at DESC LIMIT ? OFFSET ?`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [user_id, pageSize, offset]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    let sqlReviewCount = `SELECT COUNT(*) as count FROM review where user_id = ?`;

    const reviewCounts = await mysqlPool.queryWithValues(sqlReviewCount, [user_id]);

    if(reviewCounts.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var responseArr = []

    serviceDetails.result.forEach(item => {
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
    });

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", {counts: reviewCounts.result[0].count, reviews: responseArr}));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get all service provider reviews===================================================
exports.serviceProviderReviews = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * pageSize;
    const service_provider_id = req.params.service_provider_id;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExistingUser = await mysqlPool.queryWithValues('select * from user where id = ?', [service_provider_id])

    if(getExistingUser.error || getExistingUser.result === undefined || getExistingUser.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
    }

    let sql = `SELECT review.*, user.*, service.*, sub_service.*
    FROM review 
    
    LEFT JOIN (
      SELECT id AS user_id, first_name, last_name, email, phone, profile_picture
      FROM user
    ) AS user ON user.user_id = review.user_id

    LEFT JOIN (
      SELECT id AS service_id, image, name, info
      FROM service
    ) AS service ON service.service_id = review.service_id

    LEFT JOIN (
      SELECT id AS sub_service_id, image AS sub_service_image, name AS sub_service_name, info AS sub_service_info
      FROM sub_service
    ) AS sub_service ON sub_service.sub_service_id = review.sub_service_id

    where review.service_provider_id = ? ORDER BY review.created_at DESC LIMIT ? OFFSET ?`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [service_provider_id, pageSize, offset]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
    }

    let sqlReviewCount = `SELECT COUNT(*) as count FROM review where service_provider_id = ?`;

    const reviewCounts = await mysqlPool.queryWithValues(sqlReviewCount, [service_provider_id]);

    if(reviewCounts.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var responseArr = []

    serviceDetails.result.forEach(item => {
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
    });

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", {counts: reviewCounts.result[0].count, reviews: responseArr}));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Hide unhide review===================================================
exports.reviewHideUnhide = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const user_id = req.params.user_id;
    const review_id = req.params.review_id;
    const hideUnhide = req.params.hideUnhide;

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    const getExistingUser = await mysqlPool.queryWithValues('select * from user where id = ? and type = "client"', [user_id])

    if(getExistingUser.error || getExistingUser.result === undefined || getExistingUser.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageUserNotFound, ""));
    }

    const getExistingReview = await mysqlPool.queryWithValues('select * from review where id = ?', [review_id])

    if(getExistingReview.error || getExistingReview.result === undefined || getExistingReview.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageReviewNotFound, ""));
    }

    if(hideUnhide === "hide") {
      const hideReviewResult = await mysqlPool.queryWithValues('update review set is_hidden = 1 where id = ?', [review_id])

      if(hideReviewResult.error || hideReviewResult.result === undefined || hideReviewResult.result.length === 0) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
    } else if(hideUnhide === "unhide") {
      const unhideReviewResult = await mysqlPool.queryWithValues('update review set is_hidden = 0 where id = ?', [review_id])

      if(unhideReviewResult.error || unhideReviewResult.result === undefined || unhideReviewResult.result.length === 0) {
        return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
      }
    } else {
      throw Error ('invlid type')
    }
   
    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get reviews by service id===================================================
exports.reviewsByService = async (req, res) => {
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
 
    let sql = `SELECT review.*, user.*, service.*, sub_service.*
    FROM review 
    
    LEFT JOIN (
      SELECT id AS user_id, first_name, last_name, email, phone, profile_picture
      FROM user
    ) AS user ON user.user_id = review.user_id

    LEFT JOIN (
      SELECT id AS service_id, image, name, info
      FROM service
    ) AS service ON service.service_id = review.service_id

    LEFT JOIN (
      SELECT id AS sub_service_id, image AS sub_service_image, name AS sub_service_name, info AS sub_service_info
      FROM sub_service
    ) AS sub_service ON sub_service.sub_service_id = review.sub_service_id

    where review.service_id = ? ORDER BY review.created_at DESC LIMIT ? OFFSET ?`;

    const serviceDetails = await mysqlPool.queryWithValues(sql, [service_id, pageSize, offset]);

    if(serviceDetails.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    let sqlReviewCount = `SELECT COUNT(*) as count FROM review where service_id = ?`;

    const reviewCounts = await mysqlPool.queryWithValues(sqlReviewCount, [service_id]);

    if(reviewCounts.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var responseArr = []

    serviceDetails.result.forEach(item => {
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
    });

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", {counts: reviewCounts.result[0].count, reviews: responseArr}));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};