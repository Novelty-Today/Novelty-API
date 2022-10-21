const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const Order = mongoose.model("Order");
const crypto = require("crypto");

const checkAvailableTickets = (
  eventId,
  dateIdentifier,
  requestedNumberOfTickets,
  res
) => {
  return new Promise((resolve, reject) => {
    return Promise.all([
      Event.findById(eventId),
      Order.find({ eventId, dateIdentifier }),
    ])
      .then((data) => {
        if (!data[0]) {
          sendOrderErrorMessage("CANT_FIND_EVENT", res);
          return reject("order error");
        }

        let numberOfTicketsSold = 0;
        data[1].forEach((order) => {
          order.tickets.forEach((ticket) => {
            if (ticket.status == "active") {
              numberOfTicketsSold++;
            }
          });
        });

        if (numberOfTicketsSold >= data[0].capacity) {
          sendOrderErrorMessage("ALL_TICKETS_SOLD", res);
          return reject("order error");
        }

        if (data[0].capacity - numberOfTicketsSold < requestedNumberOfTickets) {
          sendOrderErrorMessage(
            "TOO_MANY_TICKETS_REQUESTED",
            res,
            data[0].capacity - numberOfTicketsSold
          );
          return reject("order error");
        }

        resolve(data[0]);
      })
      .catch((error) => {
        console.log("Error afeahfoah930r348r7&*&^ ", error);
        sendOrderErrorMessage("SOMETHING_WENT_WRONG", res);
        return reject("order error");
      });
  });
};

const getOrderRequest = (locationId, price, quantity) => {
  return {
    idempotencyKey: crypto.randomBytes(12).toString("hex"),
    order: {
      locationId: locationId,
      lineItems: [
        {
          name: "Ticket",
          quantity: quantity.toString(),
          basePriceMoney: {
            amount: parseInt(parseFloat(price) * 100),
            currency: "USD",
          },
        },
      ],
    },
  };
};

const sendOrderErrorMessage = (error, res, ticketsLeft = null) => {
  // console.log('sendOrderErrorMessage ', error, ticketsLeft)
  switch (error) {
    case "CANT_FIND_EVENT":
      res.send({
        errorMessage: "This Event has been deleted by host.",
      });
      break;
    case "ALL_TICKETS_SOLD":
      res.send({
        errorMessage: "All tickets for this Event are already sold.",
      });
      break;
    case "ORDER_CREATION_ERROR":
      res.send({
        errorMessage: "Could not create order. Please contact support.",
      });
      break;
    case "TOO_MANY_TICKETS_REQUESTED":
      res.send({
        errorMessage: `Only ${ticketsLeft} tickets left for this event.`,
      });
      break;
    default:
      res.send({
        errorMessage: `Something went wrong. Please try again.`,
      });
      break;
  }
};

const sendErrorMessage = (errors, res) => {
  try {
    switch (errors[0].code) {
      case "UNAUTHORIZED":
        res.send({
          errorMessage:
            "Server Not Authorized. Please check your server permission.",
        });
        break;
      case "GENERIC_DECLINE":
        res.send({
          errorMessage: "Card declined. Please re-enter card information.",
        });
        break;
      case "VERIFY_CVV_FAILURE":
        res.send({
          errorMessage: "Invalid CVV. Please re-enter card information.",
        });
        break;
      case "ADDRESS_VERIFICATION_FAILURE":
        re.send({
          errorMessage:
            "Invalid Postal Code. Please re-enter card information.",
        });
        break;
      case "EXPIRATION_FAILURE":
        res.send({
          errorMessage:
            "Invalid expiration date. Please re-enter card information.",
        });
        break;
      case "INSUFFICIENT_FUNDS":
        res.send({
          errorMessage:
            "Insufficient funds; Please try re-entering card details.",
        });
        break;
      case "CARD_NOT_SUPPORTED":
        res.send({
          errorMessage:
            "	The card is not supported either in the geographic region or by the MCC; Please try re-entering card details.",
        });
        break;
      case "PAYMENT_LIMIT_EXCEEDED":
        res.send({
          errorMessage:
            "Processing limit for this merchant; Please try re-entering card details.",
        });
        break;
      case "TEMPORARY_ERROR":
        res.send({
          errorMessage: "Unknown temporary error; please try again.",
        });
        break;
      case "MISSING_REQUIRED_PARAMETER":
        res.send({
          errorMessage:
            "Missing required parameters. Please, re-enter card information.",
        });
        break;
      case "TRANSACTION_LIMIT":
        res.send({
          errorMessage:
            "You have insufficient funds to complete the transaction.",
        });
        break;
      default:
        res.send({
          errorMessage:
            "Payment error. Please contact support if issue persists.",
        });
        break;
    }
  } catch (error) {
    console.log("Error jahiu ", error);
    res.send({
      errorMessage: "Unknown error. Please contact support if issue persists.",
    });
  }
};

module.exports = {
  sendErrorMessage,
  sendOrderErrorMessage,
  checkAvailableTickets,
  getOrderRequest,
};
