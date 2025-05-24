const express = require('express');
const verifyToken = require('../middleware/auth');
const Household = require("../models/Household");
const User = require('../models/User');

const router = express.Router();

// Create a New Household
router.post('/', verifyToken, async (req, res) => {
  const { name } = req.body;
  const ownerId = req.user.id;

  try {
    const newHousehold = new Household({
      name,
      owner: ownerId,
      members: [ownerId], // owner is automatically a member
    });

    await newHousehold.save();

    res.status(201).json({
      message: 'Household created successfully',
      household: newHousehold,
    });
  } catch (err) {
    console.error('Household creation error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Invite User to a Household
router.post('/invite', verifyToken, async (req, res) => {
  const ownerId = req.user.id;
  const { email } = req.body;

  try {
    // 1. Find the invited user
    const invitedUser = await User.findOne({ email });
    if (!invitedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Find the owner's household
    const household = await Household.findOne({ owner: ownerId });
    if (!household) {
      return res.status(404).json({ message: "No household found for current user" });
    }

    // 3. Check if already a member
    if (household.members.includes(invitedUser._id)) {
      return res.status(400).json({ message: "User already in household" });
    }

    // 4. Add the new member
    household.members.push(invitedUser._id);
    await household.save();

    res.json({
      message: "User added to household",
      household,
    });
  } catch (err) {
    console.error("Invite error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Current User's Household
router.get('/me', verifyToken, async (req, res) => {
  try {
    const household = await Household.findOne({ members: req.user.id }).populate('owner', 'name email');

    if (!household) {
      return res.status(404).json({ message: 'No household found' });
    }

    res.json({ household });
  } catch (err) {
    console.error('Fetch household error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// List all users in the household
router.get('/members', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const household = await Household.findOne({ members: userId }).populate('members', 'name email');

    if (!household) {
      return res.status(404).json({ message: 'Household not found' });
    }

    res.json({
      members: household.members,
    });
  } catch (err) {
    console.error("Fetch members error:", err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Allow user to leave a household
router.delete('/leave', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const household = await Household.findOne({ members: userId });

    if (!household) {
      return res.status(404).json({ message: 'Household not found' });
    }

    // Remove user from members array
    household.members = household.members.filter(
      (memberId) => memberId.toString() !== userId
    );

    // If no members left, delete the household
    if (household.members.length === 0) {
      await Household.findByIdAndDelete(household._id);
      return res.json({ message: 'Household deleted (no members left)' });
    }

    await household.save();
    res.json({ message: 'You have left the household' });

  } catch (err) {
    console.error('Leave error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
