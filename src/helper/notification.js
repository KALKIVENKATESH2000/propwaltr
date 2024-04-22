const mysqlPool = require('../helper/mysql')
const util = require('../util/util')
var fcm = require('fcm-notification');
var FCM = new fcm('./serviceAccountKey.json');
const notificationType = require('../util/enum/notification')


//=========================================Helper private function===========================================
function saveNotificationHistory(receiver_user_id, data) {
    return new Promise (async (resolve)=>{
        const databaseValue = [util.getDBId(), receiver_user_id, data.service_id, data.sub_service_id, data.user_service_id, data.thread_id, data.title, data.body, data.type, 0, util.currentTimestamp(), util.currentTimestamp()]
        const sqlResult = await mysqlPool.queryWithValues('INSERT INTO notification (id, user_id, service_id, sub_service_id, user_service_id, thread_id, title, body, type, is_read, created_at, updated_at) VALUES (?)', [databaseValue])
        resolve('')
    });
}

function getFCMTokens(receiver_user_id) {
    return new Promise (async (resolve)=>{
        const userTokens = await mysqlPool.queryWithValues('select * from user_session where user_id = ? and is_expired = 0 and fcm_token <> ""', [receiver_user_id])
        var fcmTokens = []

        if(userTokens.error || userTokens.result === undefined || userTokens.result.length === 0) {
            resolve([])
        }

        userTokens.result.forEach(element => {
            fcmTokens.push(element.fcm_token)
        });

        resolve(fcmTokens)
    });
}

function sendNotification(receiver_user_id, data) {
    return new Promise (async (resolve)=>{
        try {
            const userTokens = await getFCMTokens(receiver_user_id)

            if(userTokens.length === 0) {
                resolve(false)
                return;
            }

            var message = {
                data: data,
                notification:{
                  title : data.title,
                  body : data.body
                }
              };
    
            FCM.sendToMultipleToken(message, userTokens, async function(err, response) {
                if(err){
                    console.log('err--', err);
                    resolve(false)
                } else {
                    // console.log('response-----', response);
                    await saveNotificationHistory(receiver_user_id, data)
                    resolve(true)
                }
            })
        } catch {
            resolve(false)
        }
    });
}

function sendNotificationToAllAdmins(data) {
    return new Promise (async (resolve)=>{
        try {
            const allAdmins = await mysqlPool.queryWithValues('select * from user where type = "admin" or type = "sub_admin"')
            
            if(allAdmins.error || allAdmins.result === undefined || allAdmins.result.length === 0) {
                resolve(false)
                return;
            }
            
            var count = allAdmins.result.length

            allAdmins.result.forEach(async element => {
                const tokens = await getFCMTokens(element.id)
                
                if(tokens.length === 0) {
                    resolve(false)
                    return;
                }
    
                var message = {
                    data: data,
                    notification:{
                      title : data.title,
                      body : data.body
                    }
                  };
        
                FCM.sendToMultipleToken(message, tokens, async function(err, response) {
                    if(err){
                        console.log('err--', err);
                        resolve(false)
                    } else {
                        // console.log('response-----', response);
                        await saveNotificationHistory(element.id, data)
                        resolve(true)
                    }

                    count = count - 1

                    if(count === 0) {
                        
                    }
                })
            });
        } catch {
            resolve(false)
        }
    });
}

// ========================================Public functions===================================================
exports.sendNotificationForChatMessage = async (receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "You have an new message"
        data.type = notificationType.MESSAGE
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForNewRequest = async (data) => {
    return new Promise (async (resolve)=>{
        data.title = "Received new service request"
        data.type = notificationType.NEW_REQUEST
        data.body = ''
        const result = await sendNotificationToAllAdmins(data)
        resolve(result)
    })
};

exports.sendNotificationForNewRequestToServiceProvider = async (receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "New service request"
        data.type = notificationType.NEW_REQUEST
        data.body = 'You\'ve received new service request'
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForServiceRequestAccepted = async (receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "Service request accepted"
        data.type = notificationType.SERVICE_ACCEPTED
        data.body = 'Your service request has been accepted'
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForServiceWaitingForDocumentsAndDetails = async (receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "Attention"
        data.type = notificationType.SERVICE_WAITING
        data.body = 'Your service request goes to waiting state, please share required information.'
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForStartService = async (receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "Service started"
        data.type = notificationType.SERVICE_STARTED
        data.body = 'Your service request has been started'
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForServiceCompleteRequest = async (receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "Service completed"
        data.type = notificationType.COMPLETED_REQUEST
        data.body = 'Your service has been completed by service provider, please review and give us your feedback.'
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForServiceCompleteAccept = async (receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "Service completed"
        data.type = notificationType.SERVICE_COMPLETE
        data.body = 'Service complete request has been accepted by client.'
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForServiceCompleteReject = async (receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "Service completed reject"
        data.type = notificationType.SERVICE_COMPLETE_REJECT
        data.body = 'Service complete request has been rejected by client'
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForServiceReview = async (receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "Received new review"
        data.type = notificationType.REVIEW
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForServiceDisputeCreate = async (receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "Received dispute for service"
        data.type = notificationType.DISPUTE_CREATE
        data.body = 'You can create chat session with client and discuss further.'
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForServiceDisputeResolved = async (receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "Dispute resolved"
        data.type = notificationType.DISPUTE_RESOLVED
        data.body = 'Your dispute has been resolved.'
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForServiceDisputeRefund = async (receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "Refund initiated"
        data.type = notificationType.REFUND_INIT
        data.body = 'Refund request has been initiated, you will receive amount within 7 working days to your original payment source.'
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForAccountVerification = async (is_approved, receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "Account " + (is_approved ? "approved" : "rejected")
        data.type = notificationType.ACCOUNT_VERIFICATION
        if(is_approved) {
            data.body = 'Congratulations..! Your account has been approved by admin.'
        } else {
            data.body = 'Sorry.. you account has been rejected by admin, please contact to admin for more details.'
        }
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};

exports.sendNotificationForAccountBlock = async (is_blocked, receiver_user_id, data) => {
    return new Promise (async (resolve)=>{
        data.title = "Account " + (is_blocked ? "blocked" : "unblocked")
        data.type = notificationType.ACCOUNT_VERIFICATION
        if(is_blocked) {
            data.body = 'Sorry.. you account has been blocked by admin, please contact to admin for more details.'
        } else {
            data.body = 'Congratulations..! Your account has been unblocked by admin.'
        }
        const result = await sendNotification(receiver_user_id, data)
        resolve(result)
    })
};