const mysqlPool = require('../../../helper/mysql')
const util = require('../../../util/util')
const constant = require('../../../util/constant')
const authHelper = require('../../../helper/auth')
const razorpayHelper = require('../../../helper/razorpay')
const notificationHelper = require('../../../helper/notification')

// ========================================Create payment===================================================
exports.createPayment = async (req, res) => {
  try {
    const autToken = req.headers[constant.authorization];
    const {items, offer_code} = req.body;

    if(!items || items.length === 0 ||
    offer_code === undefined || offer_code === null) {
      return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
  }

    if(!autToken || autToken === "" || autToken === null) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenMissing, ""));
    }

    const authResult = await authHelper.verifyJWTToken(autToken);

    if(!authResult.status) {
        return res.status(constant.responseCodeTokenExpired).json(util.responseJSON(false, constant.responseMessageTokenExpired, ""));
    }

    let offer;

    if(offer_code) {
      const getExistingOffer = await mysqlPool.queryWithValues(`select * from coupon where code = ? and start_date < ? and end_date > ? and status = 'ACTIVE'`, [offer_code, util.currentTimestamp(), util.currentTimestamp()])

      if(getExistingOffer.error || getExistingOffer.result === undefined || getExistingOffer.result.length === 0) {
        return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidOfferId, ""));
      }

      offer = getExistingOffer.result[0];
    }

    var throwError = false
    var amount = 0;
    var serviceWiseAmount = {};

    await Promise.all(
      items.map(async element => {
        if(!element.service_id ||
          !element.sub_service_id ||
          !element.duration ||
          !element.frequency ||
          !element.property_id) {
            throwError = true
            return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageRequiredFieldsAreMissing, ""));
        }

        const getExistingService = await mysqlPool.queryWithValues('select * from service where id = ?', [element.service_id])

        if(getExistingService.error || getExistingService.result === undefined || getExistingService.result.length === 0) {
          throwError = true
          return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidServiceId + element.service_id, ""));
        }

        const getExistingSubService = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [element.sub_service_id])

        if(getExistingSubService.error || getExistingSubService.result === undefined || getExistingSubService.result.length === 0) {
          throwError = true
          return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidSubServiceId + element.sub_service_id, ""));
        }
        
        const subService = getExistingSubService.result[0];

        amount = amount + subService.amount * getVisitCounts(element.duration, element.frequency);
        serviceWiseAmount[element.service_id + element.sub_service_id] = {
          base_amount: subService.amount * getVisitCounts(element.duration, element.frequency)
        };

        const getExistingProperty = await mysqlPool.queryWithValues('select * from property where id = ?', [element.property_id])

        if(getExistingProperty.error || getExistingProperty.result === undefined || getExistingProperty.result.length === 0) {
          throwError = true
          return res.status(constant.responseCodeUserNotFound).json(util.responseJSON(false, constant.responseMessageInvalidPropertyId + element.property_id, ""));
        }
     }));

    if(throwError) {
      return
    }

    let discount = 0

    if(offer) {
      if(offer.discount_type === 'PERCENTAGE') {
        discount = ((offer.amount / 100) * amount);
      } else if(offer.discount_type === 'FLAT') {
        discount = offer.amount;
      }
    }

    const userPurchaseId = util.getDBId()
    const purchaseDatabaseValue = [userPurchaseId, authResult.id, offer ? offer.id : '', toFixTwoDigits(amount), toFixTwoDigits(discount), toFixTwoDigits(amount - discount), 'PENDING', util.currentTimestamp(), util.currentTimestamp()]
    const addedPurchase = await mysqlPool.queryWithValues('INSERT INTO purchase (id, user_id, coupon_id, base_amount, discount, total_amount, status, created_at, updated_at) VALUES (?)', [purchaseDatabaseValue])

    if(addedPurchase.error || addedPurchase.result === undefined || addedPurchase.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    await Promise.all(
      items.map(async element => {
        const serviceDetails = serviceWiseAmount[element.service_id + element.sub_service_id];
        const id = util.getDBId()
        const itemDiscount = (serviceDetails.base_amount * discount) / amount
        const databaseValue = [id, authResult.id, element.service_id, element.sub_service_id, element.property_id, userPurchaseId, toFixTwoDigits(serviceDetails.base_amount), toFixTwoDigits(itemDiscount), toFixTwoDigits(serviceDetails.base_amount - itemDiscount),'', element.duration, element.frequency, '', '', util.currentTimestamp(), util.currentTimestamp()]
        const addedUserService = await mysqlPool.queryWithValues('INSERT INTO user_service (id, user_id, service_id, sub_service_id, property_id, purchase_id, base_amount, discount, total_amount, status, duration, frequency, service_provider_id, assigned_by, created_at, updated_at) VALUES (?)', [databaseValue])

        if(addedUserService.error || addedUserService.result === undefined || addedUserService.result.length === 0) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }
     }));

    const getUserPurchase = await mysqlPool.queryWithValues('select * from purchase where id = ?', [userPurchaseId])

    if(getUserPurchase.error || getUserPurchase.result === undefined || getUserPurchase.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    var responseDic = getUserPurchase.result[0];

    const getUserService = await mysqlPool.queryWithValues('select * from user_service where purchase_id = ?', [userPurchaseId])

    if(getUserService.error || getUserService.result === undefined || getUserService.result.length === 0) {
      return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
    }

    responseDic.user_services = getUserService.result;

    res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", responseDic));
  } catch(error) {
    res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
  }
};

// ========================================Payment callback===================================================
exports.confirmPayment = async (req, res) => {
    try {
        const payment_id = req.params.pay_id;

        if(payment_id === "") {
          return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageInvalidPaymentId, ""));
        }

        let payment_detail = await razorpayHelper.getPaymentDetails(payment_id);

        if(!payment_detail.status) {
          return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, payment_detail.data || constant.responseMessageInvalidPaymentId, ""));
        }

        const notes = payment_detail.data.notes;
        const purchase_id = notes.purchase_id;

        if(purchase_id === "") {
          return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageInvalidPaymentId, ""));
        }

        const getPurchase = await mysqlPool.queryWithValues('select * from purchase where id = ?', [purchase_id])

        if(getPurchase.error || getPurchase.result === undefined || getPurchase.result.length === 0) {
          return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessageInvalidPaymentId, ""));
        }

        var purchase = getPurchase.result[0]

        if(purchase.status != 'PENDING') {
          return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, constant.responseMessagePaymentAlreadyUpdated + purchase.status, ""));
        } 

        payment_detail = await razorpayHelper.capturePayment(purchase.total_amount, payment_id);

        if(!payment_detail.status) {
          return res.status(constant.responseCodeValidationError).json(util.responseJSON(false, payment_detail.data || constant.responseMessageInvalidPaymentId, ""));
        }

        purchase.payment_id = payment_id;
        purchase.status = payment_detail.data.status.toLowerCase() === 'captured' ? 'SUCCESS' : 'FAILED';
        purchase.updated_at = util.currentTimestamp();

        const databaseValue = [purchase.payment_id, purchase.status, purchase.updated_at, purchase.id]
        const updatedPurchase = await mysqlPool.queryWithValues('update purchase set payment_id = ?, status = ?, updated_at = ? where id = ?', databaseValue)

        if(updatedPurchase.error || updatedPurchase.result === undefined || updatedPurchase.result.length === 0) {
          return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
        }

        if(purchase.status.toLowerCase() === "success") {
          const databaseValue = ['NEW', util.currentTimestamp(), purchase.id]
          const updatedUserService = await mysqlPool.queryWithValues('update user_service set status = ?, updated_at = ? where purchase_id = ?', databaseValue)

          if(updatedUserService.error || updatedUserService.result === undefined || updatedUserService.result.length === 0) {
            return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
          }

          notificationHelper.sendNotificationForNewRequest({
            purchase_id: purchase.id,
            sub_service_id: "",
            user_service_id: "",
            thread_id: ""
          })


          const getUserService = await mysqlPool.queryWithValues('select * from user_service where purchase_id = ?', [purchase.id])

          if(getUserService.error || getUserService.result === undefined || getUserService.result.length === 0) {
            return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, ""));
          }

          await Promise.all(
            getUserService.result.map(async (element) => {
              let visitCounts = getVisitCounts(element.duration, element.frequency);
              let loopCount = visitCounts;
              let databaseValue = [];

              while (loopCount > 0) {
                const id = util.getDBId()
                databaseValue.push([id, element.service_id, element.sub_service_id, purchase.id, element.id, element.user_id, 'PENDING', toFixTwoDigits(element.base_amount / visitCounts), toFixTwoDigits(element.discount / visitCounts), toFixTwoDigits(element.total_amount / visitCounts), util.currentTimestamp(), util.currentTimestamp()])
                loopCount--;
              }

              const addedVisits = await mysqlPool.queryWithValues('INSERT INTO user_service_visit (id, service_id, sub_service_id, purchase_id, user_service_id, user_id, status, base_amount, discount, total_amount, created_at, updated_at) VALUES ?', [databaseValue])
      
              if(addedVisits.error || addedVisits.result === undefined || addedVisits.result.length === 0) {
                return res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, addedVisits));
              }
            })
          )

          var user_services = [];

          for (let index = 0; index < getUserService.result.length; index++) {
            let element = getUserService.result[index];
            
            const service = await mysqlPool.queryWithValues('select * from service where id = ?', [element.service_id])

            if(service.result && service.result.length > 0) {
              element.service = service.result[0];
            } else {
              element.service = null;
            }
      
            const subService = await mysqlPool.queryWithValues('select * from sub_service where id = ?', [element.sub_service_id])
      
            if(subService.result && subService.result.length > 0) {
              element.sub_service = subService.result[0];
            } else {
              element.sub_service = null;
            }

            const property = await mysqlPool.queryWithValues('select * from property where id = ?', [element.property_id])
      
            if(property.result && property.result.length > 0) {
              element.property = property.result[0];
            } else {
              element.property = null;
            }
      
            user_services.push(element);
          }

          purchase.user_services = user_services;
        }

        res.status(constant.responseCodeSuccess).json(util.responseJSON(true, "", purchase));
    } catch {
      res.status(constant.responseCodeInternalServerError).json(util.responseJSON(false, constant.responseMessageInternalServerError, "f"));
    }
  };

function toFixTwoDigits(amount) {
  return Number.parseFloat(amount).toFixed(2)
}

function getVisitCounts(duration, frequency) {
    var total_count = 0
        
    if(duration.toLowerCase() == "one_time") {
      if(frequency.toLowerCase() == "once") {
        total_count = 1
      }
    } else if(duration.toLowerCase() == "monthly") {
      if(frequency.toLowerCase() == "once_a_week") {
        total_count = 4
      } else if(frequency.toLowerCase() == "once_a_month") {
        total_count = 1
      }
    } else if(duration.toLowerCase() == "quarterly") {
      if(frequency.toLowerCase() == "once_a_week") {
        total_count = 12
      } else if(frequency.toLowerCase() == "once_a_month") {
        total_count = 3
      } else if(frequency.toLowerCase() == "once_a_quarter") {
        total_count = 1
      }
    } else if(duration.toLowerCase() == "half_yearly") {
      if(frequency == "once_a_week") {
        total_count = 24
      } else if(frequency.toLowerCase() == "once_a_month") {
        total_count = 6
      } else if(frequency.toLowerCase() == "once_a_quarter") {
        total_count = 2
      } else if(frequency.toLowerCase() == "once_in_half_a_year") {
        total_count = 1
      }
    } else if(duration.toLowerCase() == "yearly") {
      if(frequency.toLowerCase() == "once_a_week") {
        total_count = 48
      } else if(frequency.toLowerCase() == "once_a_month") {
        total_count = 12
      } else if(frequency.toLowerCase() == "once_a_quarter") {
        total_count = 4
      } else if(frequency.toLowerCase() == "once_in_half_a_year") {
        total_count = 2
      } else if(frequency.toLowerCase() == "once_in_a_year") {
        total_count = 1
      }
    }

    return total_count;
  }