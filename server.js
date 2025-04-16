const express = require("express");
const connectDB = require('./config/mongodp');
const dotenv = require('dotenv').config()
const clinicalCentersRoute = require('./routes/clinicalCentersRoute');


const PORT = process.env.PORT || 5000

const app = express()

connectDB()

app.use('/api/v1/clinicalCenters', clinicalCentersRoute);


app.listen(PORT, () => console.log(`Sever running on port ${PORT}`))