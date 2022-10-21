const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const { Client } = require("square");
const crypto = require("crypto");
const { requireAuth } = require("../middlewares/requireAuth");
const { squareConfig } = require("../constants");
const { createOrder } = require("../functions/orders");
const {
  sendErrorMessage,
  checkAvailableTickets,
  getOrderRequest,
} = require("../functions/payments");

const defaultClient = new Client({
  environment: squareConfig.squareEnvironment,
  accessToken: squareConfig.squareAccessToken,
});

const { paymentsApi, ordersApi, locationsApi, customersApi, cardsApi, client } =
  defaultClient;

router.post("/createOrder", requireAuth, (req, res) => {
  let event = req.body.event;

  return createOrder(
    req.user,
    event.eventId,
    event.dateObject.dateIdentifier,
    1
  )
    .then(() => {
      res.send({ message: "success" });
    })
    .catch((error) => {
      console.log("Error ajifhgau ", error);
    });
});

router.post("/chargeUserCardAndGetOrder", requireAuth, async (req, res) => {
  let price;

  const getPaymentRequestObject = (createOrderResponse) => {
    if (req.body.isCustomer) {
      return {
        idempotencyKey: crypto.randomBytes(12).toString("hex"),
        sourceId: req.body.customer_card_id,
        amountMoney: { ...createOrderResponse.result.order.totalMoney },
        orderId: createOrderResponse.result.order.id,
        customerId: req.user.squareId,
      };
    } else {
      return {
        idempotencyKey: crypto.randomBytes(12).toString("hex"),
        sourceId: req.body.nonce,
        amountMoney: { ...createOrderResponse.result.order.totalMoney },
        orderId: createOrderResponse.result.order.id,
        autocomplete: true,
        note: `CARDHOLDER NAME - ${req.user.name} ${req.user.lastname}`,
      };
    }
  };

  checkAvailableTickets(req.body.eventId, req.body.dateIdentifier, 1, res)
    .then((event) => {
      price = event.price;
      return locationsApi.listLocations();
    })
    .then((listLocationsResponse) => {
      const locationId = listLocationsResponse.result.locations[0].id;
      const createOrderRequest = getOrderRequest(locationId, price, 1);
      return ordersApi.createOrder(createOrderRequest);
    })
    .then((createOrderResponse) => {
      const createPaymentRequest = getPaymentRequestObject(createOrderResponse);
      return paymentsApi.createPayment(createPaymentRequest);
    })
    .then(() => {
      return createOrder(
        req.user,
        req.body.eventId,
        req.body.dateIdentifier,
        1
      );
    })
    .then(() => {
      res.send({ message: "success" });
    })
    .catch((error) => {
      console.log("Error ajifhgau ", error);
      if (error != "order error") {
        if (error.errors) {
          sendErrorMessage(error.errors, res);
        } else {
          res.send({ errorMessage: error });
        }
      }
    });
});

router.post("/chargeCustomerCard", requireAuth, async (req, res) => {
  try {
    const listLocationsResponse = await locationsApi.listLocations();
    const locationId = listLocationsResponse.result.locations[0].id;
    const createOrderRequest = getOrderRequest(locationId, req.body.price, 1);

    const createOrderResponse = await ordersApi.createOrder(createOrderRequest);

    const createPaymentRequest = {
      idempotencyKey: crypto.randomBytes(12).toString("hex"),
      customerId: req.user.squareId,
      sourceId: req.body.customer_card_id,
      amountMoney: { ...createOrderResponse.result.order.totalMoney },
      orderId: createOrderResponse.result.order.id,
    };
    await paymentsApi.createPayment(createPaymentRequest);

    return createOrder(req.user, req.body.eventId, req.body.dateIdentifier, 1)
      .then(() => {
        res.send({ status: "success" });
      })
      .catch((error) => {
        console.log("Error a%$fja ", error);
        res.send({ status: "fail" });
      });
  } catch (error) {
    console.log(`[Error] 6a4faf4786++95+ `, error);

    sendErrorMessage(error.errors, res);
  }
});

router.get("/retrieveCustomer/", requireAuth, async (req, res) => {
  if (req.user.squareId) {
    customersApi
      .retrieveCustomer(req.user.squareId)
      .then((retrieveResponse) => {
        res.send(retrieveResponse.result.customer);
      })
      .catch((error) => {
        console.log(
          `[Error] aef;kaealmcoa38(&*%^) Status:${
            error.statusCode
          }, Messages: ${JSON.stringify(error.errors, null, 2)}`,
          req.user.email
        );

        sendErrorMessage(error.errors, res);
      });
  } else {
    res.send({ message: "no cards for the user" });
  }
});

router.post("/createCustomerCard", requireAuth, async (req, res) => {
  try {
    const createCustomerCardRequestBody = {
      cardNonce: req.body.nonce,
    };
    const customerCardResponse = await customersApi.createCustomerCard(
      req.body.customer_id,
      createCustomerCardRequestBody
    );

    res.json(customerCardResponse.result.card);
  } catch (error) {
    console.log(
      `[Error] +99acr9a2era+r Status:${
        error.statusCode
      }, Messages: ${JSON.stringify(error.errors[0].code, null, 2)}`
    );

    sendErrorMessage(error.errors, res);
  }
});

router.post("/deleteCustomerCard", requireAuth, async (req, res) => {
  customersApi
    .deleteCustomerCard(req.body.customerId, req.body.cardId)
    .then((resp) => {
      res.send({ message: "Card is deleted.", success: true });
    })
    .catch((error) => {
      console.log("Error a;kukrcaro,8a3r97k9", error);
      res.send({
        message: "We could not delete card. Try again.",
        success: false,
      });
    });
});

router.post("/createCustomer", requireAuth, async (req, res) => {
  let customerResponse;
  if (!req.user.squareId) {
    customersApi
      .createCustomer({
        emailAddress: req.body.email,
        given_name: req.user.name,
        family_name: req.user.lastname,
      })
      .then((response) => {
        customerResponse = response;
        return User.findOneAndUpdate(
          { email: req.user.email },
          { $set: { squareId: customerResponse.result.customer.id } }
        );
      })
      .then(() => {
        res.send(customerResponse.result.customer);
      })
      .catch((error) => {
        console.log(
          `[Error] a687cra8cra58+5afe Status:${
            error.statusCode
          }, Messages: ${JSON.stringify(error.errors, null, 2)}`
        );

        sendErrorMessage(error.errors, res);
      });
  } else {
    res.send({ id: req.user.squareId });
  }
});

module.exports = router;
