const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  household: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Household',
    required: true,
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  splitBetween: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  isSettled: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Bill', billSchema);
