const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PaymentHistorySchema = new Schema({
  transaction: { type: String, required: true },
  amount: { type: String, required: true },
  numberOfTickets: { type: String, required: true },
  eventId: { type: String, required: true },
  date: { type: String, required: true },
});

const PaymentHistory = mongoose.model("PaymentHistory", PaymentHistorySchema);

module.exports = PaymentHistory;
