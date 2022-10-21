const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  uuid: { type: String, required: true },
  eventId: { type: String, required: true },
  dateIdentifier: { type: String, required: true },
  tickets: [
    {
      ticketUuid: { type: String, required: true },
      used: { type: Boolean, required: true, default: false },
      status: {
        type: String,
        required: false,
        enum: ["cancelled", "active"],
        default: "active",
      },
    },
  ],
  email: { type: String, required: false },
  deviceUniqueId: { type: String, required: false },
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  type: {
    type: String,
    required: true,
    enum: ["single", "group"],
    default: "single",
  },
  groupUuid: { type: String, required: false },
  boughtTime: { type: String, required: true },
  payed: { type: Number, required: true },
});

orderSchema.virtual("isOrderCancelled").get(function () {
  let isOrderCancelled = true;
  this.tickets.forEach((ticket) => {
    if (ticket.status == "active") {
      isOrderCancelled = false;
    }
  });
  return isOrderCancelled;
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
