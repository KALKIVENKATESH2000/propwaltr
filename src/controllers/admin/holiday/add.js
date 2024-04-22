const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')


// ========================================Create holiday===================================================
exports.add = async (req, res) => {
  try {
    const { name, date } = req.body;

    if(!name || name === "" || name === null || 
    !date || date === "" || date === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
    }

    const id = util.getDBId();

    const databaseValues = [id, name, date, 0, util.currentTimestamp(), util.currentTimestamp()];
    const resultHolidayAdded = await mysqlPool.queryWithValues('INSERT INTO holiday (`id`, `name`,`date`,`is_deleted`,`created_at`,`updated_at`) VALUES (?)', [databaseValues]);

    if(resultHolidayAdded.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    const resultHoliday = await mysqlPool.queryWithValues('select * from holiday where id = ?', [id])

    if(resultHoliday.error) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var holiday = resultHoliday.result[0]
   
    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", holiday));
  } catch {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};