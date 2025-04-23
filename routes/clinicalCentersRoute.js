const express = require('express');
const { 
getAllClinicalCenters, 
getClinicalCenter, 
updateClinicalCenter,
deleteClinicalCenter, 
generateNewPassword,
registerMerchant,
loginMerchant} = require('../controllers/admin/clinicalCenters.conrollers');
const SuperadminController = require('../controllers/super_admin/superAdmin.controller');
// const authController = require('../controllers/authController')
const authMiddleware = require("../middleware/authMiddleware")

const router = express.Router();


// // Protect all routes after this middleware
// router.use(authController.protect);
// router.use(authController.restrictTo('admin'));

router.post("/register",authMiddleware.authMiddleware, registerMerchant);
router.post('/admin-register', SuperadminController.registerAdmin);
// router.post("/merchant-login", loginMerchant);
// router.post("/admin-login", SuperadminController.loginAdmin)

module.exports = router;