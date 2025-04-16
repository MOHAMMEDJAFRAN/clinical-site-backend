const express = require('express');
const {createClinicalCenter, 
getAllClinicalCenters, 
getClinicalCenter, 
updateClinicalCenter,
deleteClinicalCenter, 
generateNewPassword} = require('../controllers/admin/clinicalCenters.conrollers');
// const authController = require('../controllers/authController');

const clinicalCentersRoute = express.Router();

// // Protect all routes after this middleware
// router.use(authController.protect);
// router.use(authController.restrictTo('admin'));

clinicalCentersRoute
  .route('/')
  .get(getAllClinicalCenters)
  .post(createClinicalCenter);

clinicalCentersRoute
  .route('/:id')
  .get(getClinicalCenter)
  .patch(updateClinicalCenter)
  .delete(deleteClinicalCenter);

clinicalCentersRoute
  .route('/:id/generate-password')
  .post(generateNewPassword);

module.exports = clinicalCentersRoute;