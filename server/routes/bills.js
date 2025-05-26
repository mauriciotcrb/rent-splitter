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
    const bills = await Bill.find({ household: household._id, isSettled: false });

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

// Show Who Owes Whom
router.get('/settlements', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const household = await Household.findOne({ members: userId });
    if (!household) {
      return res.status(404).json({ message: 'User not in a household' });
    }

    const bills = await Bill.find({ household: household._id, isSettled: false });

    const balances = {};

    bills.forEach((bill) => {
      const perPerson = bill.amount / bill.splitBetween.length;

      bill.splitBetween.forEach((uid) => {
        uid = uid.toString();
        balances[uid] = (balances[uid] || 0) - perPerson;
      });

      const payer = bill.paidBy.toString();
      balances[payer] = (balances[payer] || 0) + bill.amount;
    });

    const users = await User.find({ _id: { $in: Object.keys(balances) } });

    const creditors = [];
    const debtors = [];

    users.forEach((user) => {
      const uid = user._id.toString();
      const balance = parseFloat(balances[uid].toFixed(2));
      const record = {
        id: uid,
        name: user.name,
        email: user.email,
        balance
      };

      if (balance > 0) creditors.push(record);
      else if (balance < 0) debtors.push(record);
    });

    // Greedy matching to suggest settlements
    const settlements = [];

    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const amount = Math.min(
        Math.abs(debtor.balance),
        Math.abs(creditor.balance)
      );

      if (amount > 0) {
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount
        });

        debtor.balance += amount;
        creditor.balance -= amount;
      }

      if (Math.abs(debtor.balance) < 0.01) i++;
      if (Math.abs(creditor.balance) < 0.01) j++;
    }

    res.json({ settlements });

  } catch (err) {
    console.error("Settlement error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Check if settled
router.patch('/:id/settle', verifyToken, async (req, res) => {
  const billId = req.params.id;
  const userId = req.user.id;

  try {
    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    // Optional: only allow users in the household to mark it settled
    const household = await Household.findOne({ members: userId });
    if (!household || !bill.household.equals(household._id)) {
      return res.status(403).json({ message: 'Not authorized for this bill' });
    }

    bill.isSettled = true;
    await bill.save();

    res.json({ message: 'Bill marked as settled', bill });

  } catch (err) {
    console.error('Settle bill error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
