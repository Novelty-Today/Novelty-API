const mongoose = require("mongoose");
const Order = mongoose.model("Order");
const Event = mongoose.model("Event");
const User = mongoose.model("User");
const { v4: uuidv4 } = require("uuid");
const { sendChatUpdateSignal } = require("../sockets/ChatSockets");
const {
  createNotificationTicketSold,
} = require("./createNotificationFunctions");

const createOrder = (user, eventId, dateIdentifier, numberOfTickets) => {
  let eventData;
  let tickets = [];
  let order;
  const orderUuid = uuidv4();

  return Event.findById(eventId)
    .then((event) => {
      //Creating Order Object with Tickets inside it
      if (!event) throw new Error("Could not find event");

      eventData = event;

      for (var i = 0; i < numberOfTickets; i++) {
        tickets.push({ ticketUuid: uuidv4() });
      }
      order = new Order({
        uuid: orderUuid,
        email: user?.email,
        eventId: eventId,
        dateIdentifier: dateIdentifier,
        boughtTime: new Date().toUTCString(),
        tickets: tickets,
        payed: event.price * numberOfTickets,
      });
      return Order.insertMany([order]);
    })
    .then(() => {
      if (user?.email) {
        return Event.findOneAndUpdate(
          { _id: eventId, "guests.email": user?.email },
          // if waitlisted we need to change status too
          {
            $set: {
              "guests.$.confirmedWantsToGo": true,
              "guests.$.status": "accepted",
            },
          }
        );
      }
    })
    .then(() => {
      if (user?.email) {
        // Adding in Upcoming Array of user: previous instruction did not work ($addToSet with Object Problem)
        const paymentData = {
          transaction: orderUuid,
          amount: eventData.price * numberOfTickets,
          numberOfTickets: numberOfTickets,
          eventId: eventData._id,
          date: new Date().toUTCString(),
        };

        return User.findOneAndUpdate(
          {
            email: user?.email,
          },
          {
            $push: { paymentHistory: paymentData },
          }
        );
      }
    })
    .then((user) => {
      //Sending Notification to user--> that somebody bought order
      if (eventData.price != 0) {
        createNotificationTicketSold(
          eventData,
          dateIdentifier,
          user?.username ?? ""
        );
      }

      sendChatUpdateSignal([eventData.organiser, user?.email], {
        eventId,
        dateIdentifier,
      });

      return order;
    })
    .catch((error) => {
      console.log("Error fdhaf ", error);
      throw new Error("Could not create order. Please contact support.");
    });
};

module.exports = { createOrder };
