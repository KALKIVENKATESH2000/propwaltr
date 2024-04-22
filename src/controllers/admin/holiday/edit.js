const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')


// ========================================Edit Holiday===================================================
exports.edit = async (req, res) => {
  try {
    const {name, date } = req.body;
    const holiday_id = req.params.holiday_id;

    var updateDataQueryStr = 'update holiday set'
    var isUpdatingData = false

    if(name && name != "" && name != null) {
      updateDataQueryStr = updateDataQueryStr + ' `name` = "' + name + '",'
      isUpdatingData = true
    }

    if(date && date != "" && date != null) {
      updateDataQueryStr = updateDataQueryStr + ' `date` = "' + date + '",'
      isUpdatingData = true
    }

    if(isUpdatingData) {
      updateDataQueryStr = updateDataQueryStr + ' `updated_at` = "' + util.currentTimestamp() + '" where `id` = "' + holiday_id + '"';

        const resultUserDataUpdated = await mysqlPool.query(updateDataQueryStr);
    
        if(resultUserDataUpdated.error) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }
    }

    const resultHoliday = await mysqlPool.queryWithValues('select * from holiday where id = ?', [holiday_id])

    if(resultHoliday.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var holiday = resultHoliday.result[0]

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", holiday));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};


// ========================================Delete sub admin===================================================
exports.delete = async (req, res) => {
  try {
    const holiday_id = req.params.holiday_id;

    if(!holiday_id || holiday_id === "" || holiday_id === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    const resultUserAdded = await mysqlPool.queryWithValues('UPDATE holiday set `is_deleted` = 1 where id = ?', [holiday_id]);

    if(resultUserAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", ""));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};