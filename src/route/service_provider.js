const express = require('express')
const router = express.Router()
const multer = require('multer');
const upload = multer({ dest: 'uploads/service_provider/' });

//AUTH
const authModule = require('../controllers/service_provider/user/auth')
router.post('/phone', authModule.phone);
router.post('/phone/verify', authModule.verifyOTP);

//SHARED MODULE
const sharedModule = require('../controllers/shared_modules/auth')
router.post('/notification/token', sharedModule.bindNotificationToken);
router.post('/auth/refresh', sharedModule.refreshAuthToken);
router.delete('/logout', sharedModule.logout);

//USER
const serviceProviderModule = require('../controllers/service_provider/user/user')
router.put('/update', upload.single('profile_picture'), serviceProviderModule.updateUser);

//deployment test
router.get("/home", (req, res) => {
  res.send("Hello !! service provider apis perfectly deployed and working properly"
  );
});

// Error handler for wrong path
router.use('*', (req, res) => {
    res.status(404).json({ message: 'Not found, please check the URL' });
});

module.exports = router;