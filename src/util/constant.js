module.exports = Object.freeze({
    //Const data
    s3BucketServiceImages: "propwalt-service-images",
    s3BucketUserImages: "propwalt-user-images",
    s3BucketPropertyImages: "propwalt-property-images",
    s3BucketDocuments: "propwalt-documents",

    //Keys
    authorization: 'authorization',

    //Response status codes
    responseCodeTokenExpired: 401,
    responseCodeUserNotFound: 404,
    responseCodeSuccess: 200,
    responseCodeValidationError: 201,
    responseCodeInternalServerError: 500,
    responseCodeForBadReaquest:400,
    responseCodeForForbiden:403,

    //Response Messages
    responseMessageTokenExpired: "Seems like your session has been expired, can you login again to continue?",
    responseMessageTokenMissing: "Seems like we are unable to verify your identity because access token is required.",
    responseMessageRequiredFieldsAreMissing: "Seems like we are unable to find required fields from your request, can you verify request?",
    responseMessageUserNotFound: "We are unable to find this user in our database, please connect with admin.",
    responseMessagePostNotFound: "We are unable to find post in our database, please check.",
    responseMessageCommentNotFound: "We are unable to find comment in our database, please check.",
    responseMessageInternalServerError: "Sorry, we are unable to complete your request because of something went wrong, please try again later.",

    //Auth
    responseMessageOTPSendSuccess: "OTP sent to your phone number: ",
    responseMessageOTPSendFailed: "We are unable to send OTP to your phone number: #, please check number and try again",
    responseMessageOTPVerified: "Your phone number has been verified successfully",
    responseMessageOTPNotVerified: "We are unable to verify OTP, seem like expired or invalid. please try again",
    responseMessageAccountNotVerified: "Your account stil in review, your will get an notification on your mobile once approved by admin, please keep login your account in your device to get updates.",
    responseMessageAccountBlockedByAdmin: "Sorry we can't allow you to login your account because your account has been blocked by admin for some security reasons. Please contact to admin to active your account.",
    responseMessageAccountDeletedByUser: "Sorry we can't allow you to login your account because your account has been disabled, please contact to admin to reactivate your account.",
    responseMessageTokenUpdate: "Your token has been changed",
    responseMessageTokenInvalid: "Look like you are invalid user, please check your auth credentials",
    responseMessageLogoutSuccess: "Logout success",
    responseMessageEmailAlreadyRegistered: "Look like this email is already registered.",
    responseMessageEmailNotRegistered: "Look like this email has been not registered with us.",
    responseMessagePasswordInvalid: "Look like password is invalid.",
    responseMessageOldPasswordInvalid: "Look like old password is not match.",
    responseMessageSamePassword: "Look like your password is match with your previous passwords, please try another password",
    responseMessageInvalidPasswordFormat: "Look like your password format is invalid.",
    responseMessagePasswordChanged: "Your password has been changed.",

    //User
    responseMessageYourProfileUpdated: "Your profile details has been updated.",

    //Notification
    responseMessageTokenBindSuccess: "Notification token stored.",

    //Image validation
    responseMessageImageIsMandatory:"Image is mandatory field",
    responseMessageForImageValidation:"Image Should be of JPEG/JPG/PNG",
    responseMessageForImageUploadFailed:"Failed to upload image, please try again.",

    //Service
    responseMessageInvalidServiceId: "Invalid service id: ",
    responseMessageInvalidSubServiceId: "Invalid sub service id: ",
    responseMessageInvalidSubServicePlanId: "Invalid sub service plan id: ",
    responseMessageInvalidUserServiceId: "Invalid user service id: ",
    responseMessageServicePaymentNotDoneYet: "You can't changes status of this service because seems like this service is not started yet.",

    //Coupon
    responseMessageInvalidCouponCode: "Invalid coupon code",
    responseMessageCouponCodeAlreadyExist: "Coupon code already exist, please try again with new coupon code",
    responseMessageInvalidCouponCodeId: "Invalid coupon code id: ",

    //Dispute
    responseMessageInvalidDisputeId: "Invalid dispute id: ",
    responseMessageInvalidServiceProvider: "Seems like this is invalid service provider.",
    responseMessageRefundNotCreated: "Refund request not submitted, may be you already initiated refund request for this payment or may amount isn't correct.",

    //Thread
    responseMessageInvalidThreadId: "Invalid thread id: ",

    //Message
    responseMessageInvalidMessageId: "Invalid message id: ",

    //Property
    responseMessageInvalidPropertyId: "Invalid property id: ",

    //Offer
    responseMessageInvalidOfferId: "Look like coupon code is invalid or expired.",

    //Checkout
    responseMessageInvalidPaymentId: "Look like payment is invalid or not yet captured, can you try again.",
    responseMessagePaymentAlreadyUpdated: "Look like payment already updated, so you can't use it again, status: ",

    //Review
    responseMessageReviewNotFound: "Look like this review not found in database.",
});