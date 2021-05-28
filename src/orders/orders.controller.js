const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass

// Middleware

function dishExists(req, res, next) {
    const dishes = res.locals.validOrder.data.dishes;
    dishes.forEach((dish, idx) => {
      if (!dish.quantity || dish.quantity <= 0 || typeof dish.quantity !== "number") {
        return next({
          status: 400,
          message: `Dish ${idx} must have a quantity that is an integer greater than 0`,
        });
      }
    });
    next();
}

function isValidDish(req, res, next) {
    const { data: { dishes }} = req.body;
      const requiredFields = ["deliverTo", "mobileNumber", "dishes"];
      for (const field of requiredFields) {
        if (!req.body.data[field]) {
          return next({ status: 400, message: `Order must include a ${field}.` });
        }
      }
      if (dishes.length === 0 || !Array.isArray(dishes))
        return next({
          status: 400,
          message: "Order must include one dish",
        });
      res.locals.validOrder = req.body;
      next();
}

function notPending(req, res, next) {
    const status = res.locals.foundOrder.status;
    if (status !== "pending") {
      return next({
        status: 400,
        message: "An order cannot be deleted unless it is pending",
      });
    }
    return next();
}

function orderExists(req, res, next) {
    const orderId = req.params.orderId;
    const foundOrder = orders.find((order) => order.id === orderId);
    res.locals.foundOrder = foundOrder;
    if (foundOrder) {
        return next();
    } else {
        return next({
            status: 404,
            message: `Not found: ${orderId}`,
        });
    }
}

function statusUpdate(req, res, next) {
    const { data: { status } } = req.body;
    if (!status || status === "invalid")
      return next({
        status: 400,
        message:
          "Order must have a status of pending, preparing, out-for-delivery, delivered",
      });
    if (status === "delivered")
      return next({
        status: 400,
        message: "A delivered order cannot be changed",
      });
    next();
}

function checkOrderId(req, res, next) {
    const orderId = req.params.orderId;
    const id = req.body.data.id;
    if (id && orderId !== id) {
      next({
        status: 400,
        message: `Route id: ${orderId} does not match order id: ${id}.`,
      });
    }
    next();
}

// CRUD

function list(req, res, next) {
    res.json({ data: orders });
}

function create(res, res, next) {
    const id = nextId();
    const createOrder = { ...res.locals.validOrder.data, id };
    orders.push(createOrder);
    res.status(201).json({ data: createOrder });
}

function read(req, res) {
    const foundOrder = res.locals.foundOrder;
    res.json({ data: foundOrder });
}

function update(req, res, next) {
    let idx = orders.indexOf(res.locals.foundOrder);
    orders[idx] = { ...req.body.data, id: orders[idx].id };
    res.json({ data: orders[idx] });
}
  
function destroy(req, res) {
    const orderId = req.params.orderId;
    const foundIdx = orders.indexOf(orderId);
    orders.splice(foundIdx, 1);
    res.sendStatus(204);
}

module.exports = {
    list,
    create: [isValidDish, dishExists, create],
    read: [orderExists, read],
    update: [orderExists, isValidDish, dishExists, statusUpdate, checkOrderId, update],
    delete: [orderExists, notPending, destroy],
};