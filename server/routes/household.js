const express = require('express');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// Example: create a new household
router.post('/', verifyToken, (req, res) => {
  const userId = req.user.id;

  // eventually you'd save to MongoDB
  res.json({
    message: `Household created by user ${userId}`,
  });
});

// Example: get current user's household
router.get('/me', verifyToken, (req, res) => {
  const userId = req.user.id;

  // pretend we're returning from DB
  res.json({
    household: {
      id: 'fakeHouseholdId123',
      owner: userId,
      name: 'My Housemates',
    },
  });
});

module.exports = router;
