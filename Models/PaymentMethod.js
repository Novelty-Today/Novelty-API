const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PaymentMethodSchema = new Schema({
  individualOrCompany: {
    type: String,
    required: true,
    enum: ["Individual", "Company"],
  },
  companyName: {
    type: String,
    required:
      (function () {
        return this.individualOrCompany === "Company";
      },
      "must provide company name"),
  },
  name: {
    type: String,
    required:
      (function () {
        return this.individualOrCompany === "Individual";
      },
      "must provide name"),
  },
  surname: {
    type: String,
    required:
      (function () {
        return this.individualOrCompany === "Individual";
      },
      "must provide surname"),
  },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  accountType: { type: String, required: true, enum: ["Checking", "Saving"] },
  bankName: { type: String, required: true },
  routingNumber: { type: String, required: true },
  accountNumber: { type: String, required: true },
});

const PaymentMethod = mongoose.model("PaymentMethod", PaymentMethodSchema);

module.exports = PaymentMethod;
