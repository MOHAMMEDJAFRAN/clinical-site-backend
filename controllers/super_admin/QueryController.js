const Complaint = require('../../models/complientModel');
const Contact = require('../../models/contactusModel');

// Get all queries (both clinical and user)
exports.getAllQueries = async (req, res) => {
  try {
    const { type, status, search } = req.query;
    
    if (type === 'clinical') {
      // Handle clinical queries (Complaints)
      let query = Complaint.find().populate('merchant', 'name');
      
      if (status && status !== 'all') {
        query = query.where('status').equals(status);
      }
      
      if (search) {
        query = query.or([
          { clinicName: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } },
          { senderName: { $regex: search, $options: 'i' } }
        ]);
      }
      
      const complaints = await query.sort({ submittedOn: -1 }).exec();
      
      // Format the data to match frontend expectations
      const formattedComplaints = complaints.map(complaint => ({
        id: complaint._id,
        clinic: complaint.clinicName,
        subject: complaint.subject,
        message: complaint.description,
        status: complaint.status.toLowerCase().replace(' ', '-'),
        date: complaint.dateOfOccurrence.toISOString().split('T')[0],
        from: complaint.senderName,
        email: complaint.contactInfo,
        reply: complaint.notes.length > 0 ? complaint.notes[0].content : null
      }));
      
      return res.json(formattedComplaints);
      
    } else {
      // Handle user queries (Contacts)
      let query = Contact.find();
      
      if (status && status !== 'all') {
        query = query.where('status').equals(status);
      }
      
      if (search) {
        query = query.or([
          { name: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]);
      }
      
      const contacts = await query.sort({ createdAt: -1 }).exec();
      
      // Format the data to match frontend expectations
      const formattedContacts = contacts.map(contact => ({
        id: contact._id,
        name: contact.name,
        subject: contact.message.substring(0, 50) + (contact.message.length > 50 ? '...' : ''), // Using message as subject
        message: contact.message,
        status: contact.status.toLowerCase().replace(' ', '-'),
        date: contact.createdAt.toISOString().split('T')[0],
        email: contact.email,
        phone: contact.phone,
        reply: null // Contacts don't have replies in the model
      }));
      
      return res.json(formattedContacts);
    }
    
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ message: 'Server error while fetching queries' });
  }
};

// Get single query by ID
exports.getQueryById = async (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (type === 'clinical') {
      const complaint = await Complaint.findById(id).populate('merchant', 'name');
      if (!complaint) {
        return res.status(404).json({ message: 'Clinical query not found' });
      }
      
      res.json({
        id: complaint._id,
        clinic: complaint.clinicName,
        subject: complaint.subject,
        message: complaint.description,
        status: complaint.status.toLowerCase().replace(' ', '-'),
        date: complaint.dateOfOccurrence.toISOString().split('T')[0],
        from: complaint.senderName,
        email: complaint.contactInfo,
        reply: complaint.notes.length > 0 ? complaint.notes[0].content : null
      });
      
    } else {
      const contact = await Contact.findById(id);
      if (!contact) {
        return res.status(404).json({ message: 'User query not found' });
      }
      
      res.json({
        id: contact._id,
        name: contact.name,
        subject: contact.message.substring(0, 50) + (contact.message.length > 50 ? '...' : ''),
        message: contact.message,
        status: contact.status.toLowerCase().replace(' ', '-'),
        date: contact.createdAt.toISOString().split('T')[0],
        email: contact.email,
        phone: contact.phone,
        reply: null
      });
    }
    
  } catch (error) {
    console.error('Error fetching query:', error);
    res.status(500).json({ message: 'Server error while fetching query' });
  }
};

// Update query status
exports.updateQueryStatus = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    if (type === 'clinical') {
      const complaint = await Complaint.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      
      if (!complaint) {
        return res.status(404).json({ message: 'Clinical query not found' });
      }
      
      res.json({
        id: complaint._id,
        status: complaint.status.toLowerCase().replace(' ', '-')
      });
      
    } else {
      const contact = await Contact.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      
      if (!contact) {
        return res.status(404).json({ message: 'User query not found' });
      }
      
      res.json({
        id: contact._id,
        status: contact.status.toLowerCase().replace(' ', '-')
      });
    }
    
  } catch (error) {
    console.error('Error updating query status:', error);
    res.status(500).json({ message: 'Server error while updating query status' });
  }
};

// Add reply/note to a query
exports.addReplyToQuery = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { reply, userId } = req.body;
    
    if (!reply) {
      return res.status(400).json({ message: 'Reply content is required' });
    }
    
    if (type === 'clinical') {
      // Find the complaint first to check if it exists
      const complaint = await Complaint.findById(id);
      if (!complaint) {
        return res.status(404).json({ message: 'Clinical query not found' });
      }

      // Add the note to the complaint
      const note = {
        content: reply,
        addedBy: userId || null
      };

      // Update the complaint with the new note and set status to Resolved
      const updatedComplaint = await Complaint.findByIdAndUpdate(
        id,
        { 
          $push: { notes: note },
          status: 'Resolved',
          updatedAt: Date.now()
        },
        { new: true }
      ).populate('notes.addedBy', 'name email');

      if (!updatedComplaint) {
        return res.status(404).json({ message: 'Failed to update clinical query' });
      }
      
      // Get the last note (the one we just added)
      const lastNote = updatedComplaint.notes[updatedComplaint.notes.length - 1];
      
      res.json({
        id: updatedComplaint._id,
        reply: lastNote.content,
        repliedBy: lastNote.addedBy ? lastNote.addedBy.name : 'System',
        status: updatedComplaint.status.toLowerCase().replace(' ', '-')
      });
      
    } else {
      // For Contact model (non-clinical queries)
      const contact = await Contact.findByIdAndUpdate(
        id,
        { status: 'Resolved' },
        { new: true }
      );
      
      if (!contact) {
        return res.status(404).json({ message: 'User query not found' });
      }
      
      res.json({
        id: contact._id,
        status: contact.status.toLowerCase().replace(' ', '-')
      });
    }
    
  } catch (error) {
    console.error('Error adding reply to query:', error);
    res.status(500).json({ 
      message: 'Server error while adding reply to query',
      error: error.message 
    });
  }
};