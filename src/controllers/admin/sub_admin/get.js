const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')


// ========================================Get sub admins===================================================
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
    
    const result = await mysqlPool.queryWithValues(`select * from user where (type = "sub_admin" and is_disabled = 0) ORDER BY created_at DESC LIMIT ? OFFSET ?`, [pageSize, offset])

    if(result.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var responseArr = []

    result.result.forEach(item => {
      var dic = item
      dic.privileges = dic.privileges.split(',')
      delete dic.password
      responseArr.push(dic)
    });

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseArr));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};
