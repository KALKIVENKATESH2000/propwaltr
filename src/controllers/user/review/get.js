const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')

// ========================================Get reviews for service===================================================
exports.SubServiceReviews = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const service_id = req.params.service_id;
    const sub_service_id = req.params.sub_service_id;

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

    const getExistingService = await mysqlPool.queryWithValues('select * from service where id = ?', [service_id])

    if(getExistingService.error || getExistingService.result === undefined || getExistingService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidServiceId + service_id, ""));
    }

    const getExistingSubService = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [sub_service_id])

    if(getExistingSubService.error || getExistingSubService.result === undefined || getExistingSubService.result.length === 0) {
      return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidSubServiceId + sub_service_id, ""));
    }

    const getExistingUserServiceReview = await mysqlPool.queryWithValues('select * from review where sub_service_id = ? and is_hidden = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?', [sub_service_id, pageSize, offset])

    if(getExistingUserServiceReview.error || getExistingUserServiceReview.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var reviews = []

    await Promise.all(
      getExistingUserServiceReview.result.map(async item => {
        var review = item

        let sql = `SELECT id, first_name, last_name, email, profile_picture FROM user where id = ?`;

        var reviewUser = await mysqlPool.queryWithValues(sql, [review.user_id]);

        if(reviewUser.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, serviceDetails));
        }

        review.user = reviewUser.result;

        reviews.push(review);
      })
    )


    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", reviews));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Get all reviews for current user===================================================
exports.myReviews = async (req, res) => {
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

    const getExistingUserServiceReview = await mysqlPool.queryWithValues('select * from review where user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [authResult.id, pageSize, offset])

    if(getExistingUserServiceReview.error || getExistingUserServiceReview.result === undefined) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", getExistingUserServiceReview.result));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};