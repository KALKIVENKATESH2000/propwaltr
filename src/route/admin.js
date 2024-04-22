const express = require('express')
const router = express.Router()
const multer = require('multer');
const upload = multer({ dest: 'uploads/admin/' });

//AUTH
const authModule = require('../controllers/admin/user/auth')
router.post('/singup', authModule.singup);
router.post('/login', authModule.login);
router.put('/update', upload.single('profile_picture'), authModule.updateUser);
router.get('/me', authModule.getUserById);
router.post('/forgotPassword', authModule.forgotPassword);
router.post('/forgotPassword/changePassword', authModule.forgotPasswordVerifyAndChangePassword);
router.post('/changePassword', authModule.changePassword);

//SHARED MODULE
const sharedModule = require('../controllers/shared_modules/auth')
router.post('/notification/token', sharedModule.bindNotificationToken);
router.post('/auth/refresh', sharedModule.refreshAuthToken);
router.delete('/logout', sharedModule.logout);

//ADD SERVICE
const addServiceModule = require('../controllers/admin/service/add/service')
const addSubServiceModule = require('../controllers/admin/service/add/sub_service')
const addServiceUserDetailsModule = require('../controllers/admin/service/add/service_user_details')
const addServiceDocumentsModule = require('../controllers/admin/service/add/service_documents')
router.post('/service', upload.single('image'), addServiceModule.service);
router.post('/service/:service_id/sub_service', addSubServiceModule.subService);
router.post('/service/:service_id/sub_service/photos', upload.any(), addSubServiceModule.subServicePhotos);
router.post('/service/:service_id/required_user_details', addServiceUserDetailsModule.serviceRequiredUserDetails);
router.post('/service/:service_id/required_documents', addServiceDocumentsModule.serviceRequiredDocuments);

//EDIT SERVICE
const editServiceModule = require('../controllers/admin/service/edit/service')
const editSubServiceModule = require('../controllers/admin/service/edit/sub_service')
const editServiceUserDetailsModule = require('../controllers/admin/service/edit/service_user_details')
const editServiceDocumentsModule = require('../controllers/admin/service/edit/service_documents')
router.put('/service/:service_id', upload.single('image'), editServiceModule.service);
router.delete('/service/:service_id', editServiceModule.deleteService);
router.put('/service/:service_id/sub_service/photos', upload.any(), addSubServiceModule.subServicePhotos);
router.put('/service/:service_id/required_user_details', editServiceUserDetailsModule.serviceRequiredUserDetails);
router.put('/service/:service_id/required_documents', editServiceDocumentsModule.serviceRequiredDocuments);
router.put('/service/:service_id/sub_service/:sub_service_id', editSubServiceModule.subService);
router.delete('/service/:service_id/sub_service/:sub_service_id', editSubServiceModule.deleteSubService);
router.put('/service/:service_id/sub_service/:sub_service_id/:enableDisable', editSubServiceModule.subServiceEnableDisable);

//GET SERVICE
const getServiceModule = require('../controllers/admin/service/get/service')
router.get('/services', getServiceModule.service);

const getSubServiceModule = require('../controllers/admin/service/get/sub_service')
router.get('/service/:service_id/sub_services', getSubServiceModule.subService);
router.get('/service/:service_id/sub_service/:sub_service_id/:status', getSubServiceModule.userService);
router.post('/service/:service_id/service_plans', getSubServiceModule.getServicePlans);

const getServiceUserDetailsAndDocumentsModule = require('../controllers/admin/service/get/service_user_details_and_documents')
router.get('/service/:service_id/required_details', getServiceUserDetailsAndDocumentsModule.getRequiredDocumentsDetailsForService);

const getServiceCountsModule = require('../controllers/admin/service/get/counts')
router.get('/services/counts', getServiceCountsModule.serviceCounts);
router.get('/services/:service_id/sub_service/:sub_service_id/counts', getServiceCountsModule.subServiceCounts);

//DASHBOARD
const dashboardModule = require('../controllers/admin/dashboard/dashboard')
router.get('/dashboard/statistics', dashboardModule.statistics);
router.get('/dashboard/requests/new', dashboardModule.newRequest);
router.get('/dashboard/services/best', dashboardModule.bestServices);
router.get('/dashboard/services/lowest', dashboardModule.lowestServices);
router.get('/dashboard/service/:service_id/selling', dashboardModule.serviceSelling);
router.get('/dashboard/users/counts', dashboardModule.usersCount);

//USERS
const usersModule = require('../controllers/admin/users/get')
router.get('/users/client/:filter', usersModule.clientUsers);
router.get('/user/client/:user_id', usersModule.clientDetailsById);
router.get('/users/service_provider/:filter', usersModule.serviceProvidersUsers);
router.get('/user/service_provider/:user_id', usersModule.serviceProviderDetailsById);

const userEditModule = require('../controllers/admin/users/edit')
router.put('/user/:type/:user_id/verification/:VerifyUnverify', userEditModule.userVerifyUnverify);
router.put('/user/:type/:user_id/:blockUnblock', userEditModule.userBlockUnblock);

//PROPERTIES
const propertiesModule = require('../controllers/admin/properties/get')
router.get('/user/:user_id/properties', propertiesModule.properties);

//REVIEWS
const reviewsModule = require('../controllers/admin/review/get')
router.get('/user/:user_id/reviews', reviewsModule.reviews);
router.get('/service_provider/:service_provider_id/reviews', reviewsModule.serviceProviderReviews);
router.get('/service/:service_id/reviews', reviewsModule.reviewsByService);
router.put('/user/:user_id/review/:review_id/:hideUnhide', reviewsModule.reviewHideUnhide);

//COUPON
const addCouponModule = require('../controllers/admin/coupon/add')
router.post('/coupon', addCouponModule.add);

const editCouponModule = require('../controllers/admin/coupon/edit')
router.put('/coupon/:coupon_id', editCouponModule.edit);
router.put('/coupon/:coupon_id/:status', editCouponModule.updateStatus);

const getCouponModule = require('../controllers/admin/coupon/get')
router.get('/coupons/:status', getCouponModule.get);

//DISPUTE
const getDisputeModule = require('../controllers/admin/dispute/get')
router.get('/disputes/:status', getDisputeModule.get);

const editDisputeModule = require('../controllers/admin/dispute/edit')
router.put('/dispute/:dispute_id/refund', editDisputeModule.refund);
router.put('/dispute/:dispute_id/open', editDisputeModule.open);
router.put('/dispute/:dispute_id/resolved', editDisputeModule.resolved);

//MESSAGE
const sendMessageModule = require('../controllers/admin/messages/add')
router.post('/user/:user_id/thread', sendMessageModule.createChatWithClient);
router.post('/service_provider/:user_id/thread', sendMessageModule.createChatWithServiceProvider);
router.post('/thread/:thread_id/message/send', sendMessageModule.sendMessage);
router.put('/thread/:thread_id/message/:message_id', sendMessageModule.readMessage);

const getMessageModule = require('../controllers/admin/messages/get')
router.get('/thread/:thread_id/messages', getMessageModule.getMessages);
router.get('/threads', getMessageModule.getThreads);

//SUB_ADMIN
const addSubAdminModule = require('../controllers/admin/sub_admin/add')
router.post('/sub_admin', addSubAdminModule.add);

const editSubAdminModule = require('../controllers/admin/sub_admin/edit')
router.put('/sub_admin/:user_id', editSubAdminModule.edit);
router.delete('/sub_admin/:user_id', editSubAdminModule.delete);

const getSubAdminModule = require('../controllers/admin/sub_admin/get')
router.get('/sub_admins', getSubAdminModule.get);

//USER SERVICE
const userServiceModule = require('../controllers/admin/user_service/user_service')
router.post('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/user/details', userServiceModule.editUserDetails);
router.put('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/assign', userServiceModule.assignService);
router.put('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/reassign', userServiceModule.assignService);
router.put('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/accept', userServiceModule.acceptRequest);
router.put('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/waiting', userServiceModule.waitingForDocuments);
router.put('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/start', userServiceModule.startService);
router.put('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/complete', userServiceModule.completeService);
router.post('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/documents', upload.any(), userServiceModule.editUserDocuments);
router.get('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id', userServiceModule.get);
router.post('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id', upload.any(), userServiceModule.userDocuments);
router.delete('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/documents/:document_id', upload.any(), userServiceModule.deleteUserDocuments);

//NOTIFICATION
const notificationModule = require('../controllers/admin/notification/notification')
router.get('/notifications', notificationModule.get);

//HOLIDAY
const addHolidayModule = require('../controllers/admin/holiday/add')
router.post('/holiday', addHolidayModule.add);

const editHolidayModule = require('../controllers/admin/holiday/edit')
router.put('/holiday/:holiday_id', editHolidayModule.edit);
router.delete('/holiday/:holiday_id', editHolidayModule.delete);

const getHolidayModule = require('../controllers/admin/holiday/get')
router.get('/holidays', getHolidayModule.get);

//deployment test
router.get("/home", (req, res) => {
  res.send("Hello !! admin apis perfectly deployed and working properly"
  );
});

// Error handler for wrong path
router.use('*', (req, res) => {
    res.status(404).json({ message: 'Not found, please check the URL' });
});

module.exports = router;