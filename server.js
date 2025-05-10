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

const PORT = process.env.PORT || 5000

const app = express()

connectDB()

// Enable CORS for all routes
app.use(cors({
    origin:'https://clinical-site-test.vercel.app',
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


app.listen(PORT, () => console.log(`Sever running on port ${PORT}`))