// controllers/contactController.js
const Contact = require('../../models/contactusModel');
const nodemailer = require('nodemailer');

/**
 * @desc    Create new contact submission
 * @route   POST /api/contactus
 * @access  Public
 */
exports.createContact = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required fields'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate field lengths
    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot exceed 100 characters'
      });
    }

    if (phone && phone.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Phone number cannot exceed 20 characters'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 1000 characters'
      });
    }

    // Create new contact
    const contact = await Contact.create({
      name,
      email,
      phone: phone || undefined, // Store as undefined if empty
      message,
      status: 'Pending' // Explicitly set initial status
    });

    // Send notification email (fire and forget)
    sendNotificationEmail({
      name,
      email,
      phone,
      message,
      submissionId: contact._id,
      submissionDate: contact.createdAt
    }).catch(error => {
      console.error('Email sending failed:', error);
      // Don't fail the request if email fails
    });

    return res.status(201).json({
      success: true,
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        status: contact.status,
        submittedAt: contact.createdAt
      },
      message: 'Your message has been submitted successfully'
    });

  } catch (error) {
    console.error('Contact submission error:', error);

    // Handle duplicate email submissions
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a message with this email address'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('; ')
      });
    }

    // Handle unexpected errors
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again later',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get all contact submissions
 * @route   GET /api/contactus
 * @access  Private/Admin
 */
exports.getContacts = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Sorting (default: newest first)
    const sort = req.query.sort || '-createdAt';

    // Status filter
    const statusFilter = req.query.status 
      ? { status: req.query.status } 
      : {};

    // Search query
    const searchQuery = req.query.search
      ? {
          $or: [
            { name: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
            { message: { $regex: req.query.search, $options: 'i' } }
          ]
        }
      : {};

    const query = { ...statusFilter, ...searchQuery };

    // Get contacts with pagination
    const contacts = await Contact.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Contact.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: contacts,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve contact submissions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update contact submission status
 * @route   PATCH /api/contactus/:id
 * @access  Private/Admin
 */
exports.updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Pending', 'In Progress', 'Resolved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required'
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: contact,
      message: 'Status updated successfully'
    });

  } catch (error) {
    console.error('Error updating contact status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update contact status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to send notification email
 */
const sendNotificationEmail = async ({ 
  name, 
  email, 
  phone, 
  message, 
  submissionId,
  submissionDate 
}) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: process.env.EMAIL_PORT || 2525,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; width: 120px;"><strong>Submission ID:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${submissionId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Date(submissionDate).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Name:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${phone || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Message:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${message.replace(/\n/g, '<br>')}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">
          <a href="${process.env.ADMIN_DASHBOARD_URL || 'http://your-admin-dashboard.com'}/contacts/${submissionId}" 
             style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
            View in Dashboard
          </a>
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Contact Form" <${process.env.EMAIL_FROM || 'noreply@example.com'}>`,
      to: process.env.ADMIN_EMAIL || 'admin@example.com',
      subject: `New Contact Submission: ${name}`,
      html: emailHtml,
      text: `New contact form submission from ${name} (${email}). Message: ${message}`
    });

  } catch (error) {
    console.error('Error sending notification email:', error);
    // Don't throw error as this is a background task
  }
};