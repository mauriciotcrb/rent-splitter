const express = require('express');
const verifyToken = require('../middleware/auth');
const Bill = require('../models/Bill');
const Household = require('../models/Household');
const User = require('../models/User');

const router = express.Router();

// Create a new bill
router.post('/', verifyToken, async (req, res) => {
  const { title, amount, paidBy, splitBetween } = req.body;
  const userId = req.user.id;

  try {
    // 1. Validate user is in a household
    const household = await Household.findOne({ members: userId });
    if (!household) {
      return res.status(404).json({ message: 'You are not in a household' });
    }

    // 2. Validate all splitBetween users are in same household
    const invalidUsers = splitBetween.filter(id => !household.members.includes(id));
    if (invalidUsers.length > 0) {
      return res.status(400).json({ message: 'All users must be in your household' });
    }

    // 3. Create and save the bill
    const bill = new Bill({
      title,
      amount,
      paidBy,
      household: household._id,
      splitBetween,
    });

    await bill.save();
    res.status(201).json({ message: 'Bill created successfully', bill });

  } catch (err) {
    console.error('Bill creation error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Balance logic
router.get('/balances', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Find the household
    const household = await Household.findOne({ members: userId });
    if (!household) {
      return res.status(404).json({ message: 'You are not in a household' });
    }

    // Get all bills
    const bills = await Bill.find({ household: household._id });

    // Initialize balance map
    const balances = {}; // userId => balance

    bills.forEach((bill) => {
      const perPerson = bill.amount / bill.splitBetween.length;

      bill.splitBetween.forEach((user) => {
        const uid = user.toString();
        balances[uid] = (balances[uid] || 0) - perPerson;
      });

      const payer = bill.paidBy.toString();
      balances[payer] = (balances[payer] || 0) + bill.amount;
    });

    // Populate user info for readable results
    const users = await User.find({ _id: { $in: Object.keys(balances) } });

    const result = users.map((user) => ({
      name: user.name,
      email: user.email,
      balance: parseFloat(balances[user._id.toString()].toFixed(2))
    }));

    res.json({ balances: result });

  } catch (err) {
    console.error("Balance error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
