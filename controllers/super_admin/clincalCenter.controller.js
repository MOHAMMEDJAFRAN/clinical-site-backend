const ClinicalCenter = require('../../models/clinical.model');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');

// @desc    Get all clinical centers
// @route   GET /api/v1/clinical-centers
// @access  Private/Admin
exports.getClinicalCenters = catchAsync(async (req, res, next) => {
  const { status, city, search } = req.query;
  
  // Create query object
  const query = {};
  
  // Add filters
  if (status) query.status = status;
  if (city) query.city = { $regex: city, $options: 'i' };
  
  // Text search
  if (search) {
    query.$text = { $search: search };
  }
  
  // Select fields
  const select = 'clinicname city address status inChargeName phoneNumber createdAt';
  
  // Execute query
  const clinicalCenters = await ClinicalCenter.find(query)
    .select(select)
    .sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: clinicalCenters.length,
    data: clinicalCenters
  });
});

// @desc    Get single clinical center
// @route   GET /api/v1/clinical-centers/:id
// @access  Private/Admin
exports.getClinicalCenter = catchAsync(async (req, res, next) => {
  const clinicalCenter = await ClinicalCenter.findById(req.params.id);
  
  if (!clinicalCenter) {
    return next(
      new AppError(`Clinical center not found with id of ${req.params.id}`, 404)
    );
  }
  
  res.status(200).json({
    success: true,
    data: clinicalCenter
  });
});

// @desc    Create clinical center
// @route   POST /api/v1/clinical-centers
// @access  Private/Admin
exports.createClinicalCenter = catchAsync(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;
  
  const clinicalCenter = await ClinicalCenter.create(req.body);
  
  res.status(201).json({
    success: true,
    data: clinicalCenter
  });
});

// @desc    Update clinical center
// @route   PUT /api/v1/clinical-centers/:id
// @access  Private/Admin
exports.updateClinicalCenter = catchAsync(async (req, res, next) => {
  let clinicalCenter = await ClinicalCenter.findById(req.params.id);
  
  if (!clinicalCenter) {
    return next(
      new AppError(`Clinical center not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Make sure user is clinic owner or admin
  if (clinicalCenter.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError(`User ${req.user.id} is not authorized to update this clinic`, 401)
    );
  }
  
  clinicalCenter = await ClinicalCenter.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: clinicalCenter
  });
});

// @desc    Delete clinical center
// @route   DELETE /api/v1/clinical-centers/:id
// @access  Private/Admin
exports.deleteClinicalCenter = catchAsync(async (req, res, next) => {
  const clinicalCenter = await ClinicalCenter.findById(req.params.id);
  
  if (!clinicalCenter) {
    return next(
      new AppError(`Clinical center not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Make sure user is clinic owner or admin
  if (clinicalCenter.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError(`User ${req.user.id} is not authorized to delete this clinic`, 401)
    );
  }
  
  await clinicalCenter.remove();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update clinical center status
// @route   PATCH /api/v1/clinical-centers/:id/status
// @access  Private/Admin
exports.updateClinicalCenterStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  
  if (!status || !['Active', 'On Hold', 'Deactivated'].includes(status)) {
    return next(
      new AppError(`Please provide a valid status (Active, On Hold, Deactivated)`, 400)
    );
  }
  
  const clinicalCenter = await ClinicalCenter.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );
  
  if (!clinicalCenter) {
    return next(
      new AppError(`Clinical center not found with id of ${req.params.id}`, 404)
    );
  }
  
  res.status(200).json({
    success: true,
    data: clinicalCenter
  });
});