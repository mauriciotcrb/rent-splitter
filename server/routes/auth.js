const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');

const router = express.Router();

router.post('/signup', async (req, res) => {
  // Extract data from body request
  const { name, email, password } = req.body;

  // Atempt to add user
  try {
    // Check for an existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: "User created successfully" });

  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return success + token
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/me', verifyToken, (req, res) => {
  res.json({
    message: "Access granted to protected route!",
    user: req.user  // Contains { id, email }
  });
});

module.exports = router;