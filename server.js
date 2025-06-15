const express = require("express");
const connectDB = require('./config/mongodp');
// const dotenv = require('dotenv').config()
const clinicalCentersRoute = require('./routes/clinicalCentersRoute');
const authRoutes = require('./routes/authRoutes')
const cors = require('cors');
const clinicalCenters = require("./routes/clinicalCenters");
const profileAdminRoute = require("./routes/profileAdminRoute")
const doctorsRoute = require("./routes/doctorRoute")
const userpageRoute = require("./routes/userpageRoute")
const clinicDashboardRoute = require("./routes/clinicDashboardRoute")
const allClinicAppointmentRoute = require("./routes/allClinicAppointmentsRoute")
const clinicProfileRoute = require("./routes/clinicProfileRoute")
const clinicLayoutRoute = require("./routes/clinicLayoutRoute")
const staffRoute = require ("./routes/staffRoute")
const outstandingRoute = require("./routes/outstandingRoute")
const analyticsRoute = require("./routes/analyticsRoute")
const compleintRoute = require("./routes/compleintRoute")
const contactusRoute = require("./routes/contactusRoute")
const queryRoute = require("./routes/queryRoute")
const dashboardRoute = require("./routes/deshboardRoute")
const appointmentreportRoute = require("./routes/appointmentreportRoute")

const PORT = process.env.PORT || 5000

const app = express()

connectDB()

// Enable CORS for all routes
app.use(cors({origin:'https://clinical-site-test.vercel.app',
    // 'http://localhost:3000',
    
    
    credentials: true
  }));
app.use(express.json());
app.use('/api/v1/clinicalCenters', clinicalCentersRoute);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/all-centers', clinicalCenters);
app.use('/api/v1/admin-profile', profileAdminRoute);
app.use('/api/v1/Doctors', doctorsRoute);
app.use('/api/v1/user', userpageRoute);
app.use('/api/v1/clinicDashboard', clinicDashboardRoute);
app.use('/api/v1/allClinicAppointments', allClinicAppointmentRoute);
app.use('/api/v1/clinicProfile', clinicProfileRoute);
app.use('/api/v1/layout', clinicLayoutRoute);
app.use('/api/v1/staff', staffRoute);
app.use('/api/v1/outstanding', outstandingRoute);
app.use('/api/v1/analytics', analyticsRoute);
app.use('/api/v1/compleint', compleintRoute);
app.use('/api/v1/contactus', contactusRoute);
app.use('/api/v1/query', queryRoute);
app.use('/api/v1/dashboard', dashboardRoute);
app.use('/api/v1/appointmentreport', appointmentreportRoute);


app.listen(PORT, () => console.log(`Sever running on port ${PORT}`))