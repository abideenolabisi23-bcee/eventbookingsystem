const mongoose = require("mongoose");
const crypto = require("crypto");

const createFoodOrder = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).send({
        message: "Please select at least one food"
      });
    }

    const combinedItems = new Map();

    for (const item of items) {
      const foodId = item?.food || item?.foodId;
      const orderQuantity = Number(item?.quantity);

      if (
        !foodId ||
        !mongoose.isValidObjectId(foodId) ||
        !Number.isInteger(orderQuantity) ||
        orderQuantity < 1
      ) {
        return res.status(400).send({
          message: "Each food must have a valid ID and quantity"
        });
      }

      const id = String(foodId);

      combinedItems.set(
        id,
        (combinedItems.get(id) || 0) + orderQuantity
      );
    }

    const foods = await FoodModel.find({
      _id: { $in: [...combinedItems.keys()] }
    });

    if (foods.length !== combinedItems.size) {
      return res.status(404).send({
        message: "One or more selected foods could not be found"
      });
    }

    let vendorId = null;
    let totalAmount = 0;

    const orderItems = [];

    for (const food of foods) {
      const orderQuantity = combinedItems.get(
        String(food._id)
      );

      if (!food.isAvailable) {
        return res.status(400).send({
          message: `${food.name} is currently unavailable`
        });
      }

      if (Number(food.quantity) < orderQuantity) {
        return res.status(400).send({
          message: `Only ${food.quantity} portions of ${food.name} are available`
        });
      }

      if (!food.createdBy) {
        return res.status(400).send({
          message: `${food.name} has no assigned vendor`
        });
      }

      const currentVendorId = String(food.createdBy);

      if (vendorId && vendorId !== currentVendorId) {
        return res.status(400).send({
          message:
            "Please order foods from the same vendor in one checkout"
        });
      }

      vendorId = currentVendorId;

      const price = Number(food.price);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).send({
          message: `Invalid price for ${food.name}`
        });
      }

      const subtotal = price * orderQuantity;

      totalAmount += subtotal;

      orderItems.push({
        food: food._id,
        name: food.name,
        price,
        quantity: orderQuantity,
        subtotal
      });
    }

    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
      return res.status(400).send({
        message: "The order total is invalid"
      });
    }

    const orderReference =
      `FOOD-${Date.now()}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;

    const order = await FoodOrderModel.create({
      user: req.user.id,
      vendor: vendorId,
      items: orderItems,
      totalAmount,
      orderReference,
      orderStatus: "pending",
      paymentStatus: "pending"
    });

    return res.status(201).send({
      message: "Food order created successfully",
      data: order
    });
  } catch (error) {
    console.error("CREATE FOOD ORDER ERROR:", error);

    return res.status(500).send({
      message: "Food order cannot be created at this time"
    });
  }
};
