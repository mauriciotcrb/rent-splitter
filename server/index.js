const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5050;

// Connect to DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);  
const householdRoutes = require('./routes/household');
app.use('/api/household', householdRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});