const express = require('express')
const router = express.Router()
const multer = require('multer');
const upload = multer({ dest: 'uploads/users/' });

//AUTH
const authModule = require('../controllers/user/user/auth')
router.post('/phone', authModule.phone);
router.post('/phone/verify', authModule.verifyOTP);

//SHARED_MODULE
const sharedModule = require('../controllers/shared_modules/auth')
router.post('/notification/token', sharedModule.bindNotificationToken);
router.delete('/logout', sharedModule.logout);
router.delete('/delete', sharedModule.delete);
router.post('/auth/refresh', sharedModule.refreshAuthToken);

//USER
const userModule = require('../controllers/user/user/user')
router.put('/update', upload.single('profile_picture'), userModule.updateUser);
router.get('/me', userModule.getUserById);

//REF USER
const refUserModule = require('../controllers/user/user/ref_user')
router.post('/ref_user', upload.single('profile_picture'), refUserModule.updateRefUser);

//PROPERTY
const addPropertyModule = require('../controllers/user/property/add')
router.post('/property', addPropertyModule.add);
router.post('/property/:property_id/photos', upload.any(), addPropertyModule.photos);
router.post('/property/:property_id/documents', upload.any(), addPropertyModule.documents);

const editPropertyModule = require('../controllers/user/property/edit')
router.put('/property/:property_id', editPropertyModule.edit);
router.put('/property/:property_id/photos', upload.any(), editPropertyModule.photos);
router.delete('/property/:property_id/photos', editPropertyModule.deletePhotos);
router.put('/property/:property_id/documents', upload.any(), editPropertyModule.documents);
router.delete('/property/:property_id/documents', editPropertyModule.deleteDocuments);

const getPropertyModule = require('../controllers/user/property/get')
router.get('/properties', getPropertyModule.get);
router.get('/properties/:property_id', getPropertyModule.getPropertyById);

//HOME
const homeModule = require('../controllers/user/home/home')
router.get('/top-header', homeModule.topHeader);
router.get('/offers', homeModule.offers);
router.get('/services', homeModule.services);
router.get('/services/requested', homeModule.requestedServices);
router.get('/home/search', homeModule.homeSearch);

//SUB SERVICE DETAILS
const subServiceModule = require('../controllers/user/sub_service/sub_service')
router.get('/service/:service_id/sub_service', subServiceModule.subService);

//CART
const cartModule = require('../controllers/user/cart/cart')
router.post('/cart/details', cartModule.getCartDetails);

//CHECKOUT
const offerModule = require('../controllers/user/checkout/offer')
router.get('/offer/:offer_id/validate', offerModule.validate);

const paymentModule = require('../controllers/user/checkout/payment')
router.post('/service/payment', paymentModule.createPayment);
router.post('/service/payment/:pay_id/confirm', paymentModule.confirmPayment);

//SERVICE
const serviceModule = require('../controllers/user/service/service')
router.get('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id', serviceModule.getUserServiceDetails);
router.put('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/completed', serviceModule.serviceComplete);
router.put('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/reject', serviceModule.serviceCompleteReject);

//REVIEW
const addReviewModule = require('../controllers/user/review/add')
router.post('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/review', addReviewModule.review);

const getReviewModule = require('../controllers/user/review/get')
router.get('/service/:service_id/sub_service/:sub_service_id/reviews', getReviewModule.SubServiceReviews);
router.get('/service/reviews', getReviewModule.myReviews);

//USER SERVICE
const userServiceModule = require('../controllers/user/user_service/user_service')
router.get('/services/:status', userServiceModule.userService);

//DISPUTE
const disputeModule = require('../controllers/user/dispute/dispute')
router.post('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/dispute', disputeModule.dispute);

//MESSAGE
const sendMessageModule = require('../controllers/user/messages/add')
router.post('/thread', sendMessageModule.createChatWithServiceProvider);
router.post('/thread/:thread_id/message/send', sendMessageModule.sendMessage);
router.put('/thread/:thread_id/message/:message_id', sendMessageModule.readMessage);

const getMessageModule = require('../controllers/user/messages/get')
router.get('/thread/:thread_id/messages', getMessageModule.getMessages);
router.get('/threads', getMessageModule.getThreads);

//REQUIRED DOCUMENTS AND DETAILS
const getRequiredDocumentsDetailsModule = require('../controllers/user/document_details/get')
router.get('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/required/details', getRequiredDocumentsDetailsModule.getRequiredDocumentsDetailsForService);

const addRequiredDocumentsDetailsModule = require('../controllers/user/document_details/add')
router.post('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/property/documents', upload.any(), addRequiredDocumentsDetailsModule.propertyDocuments);
router.post('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/user/documents', upload.any(), addRequiredDocumentsDetailsModule.userDocuments);
router.post('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/user/details', addRequiredDocumentsDetailsModule.userDetails);
router.put('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/user/details', addRequiredDocumentsDetailsModule.editUserDetails);

//USER DOCUMENTS
const getDocumentsModule = require('../controllers/user/document_details/get')
router.get('/documents/from/:status', getDocumentsModule.getUserDocuments);
router.get('/service/:service_id/documents/from/:status', getDocumentsModule.getUserDocumentsForService);
router.get('/property/:property_id/documents/from/:status', getDocumentsModule.getUserDocumentsForProperty);
router.get('/service/:service_id/sub_service/:sub_service_id/documents/from/:status', getDocumentsModule.getUserDocumentsForServiceAndSubService);
router.get('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/documents/from/:status', getDocumentsModule.getAdminDocumentsForServiceAndSubService);

const deleteDocuments = require('../controllers/user/document_details/edit')
router.delete('/document/:document_id', deleteDocuments.deleteDocuments);
router.put('/service/:service_id/sub_service/:sub_service_id/user_service/:user_service_id/documents/read', deleteDocuments.markDocumentRead);

//NOTIFICATION
const notificationModule = require('../controllers/user/notification/notification')
router.get('/notifications', notificationModule.get);

//deployment test
router.get("/home", (req, res) => {
  res.send("Hello !! user apis perfectly deployed and working properly"
  );
});

// Error handler for wrong path
router.use('*', (req, res) => {
    res.status(404).json({ message: 'Not found, please check the URL' });
});

module.exports = router;