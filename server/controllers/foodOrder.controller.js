const mongoose = require("mongoose");
const crypto = require("crypto");

const FoodModel = require("../models/food.model");
const FoodOrderModel = require("../models/foodOrder.model");
const FoodPaymentModel = require("../models/foodPayment.model");

const refundFoodPayment = require("../utils/refundFoodPayment");


const createFoodOrder = async (req, res) => {
  try {
    console.log("FOOD ORDER BODY:", req.body);
    const { items } = req.body;

    if (
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).send({
        message:
          "Please select at least one food"
      });
    }


    // =====================================
    // COMBINE DUPLICATE FOOD ITEMS
    // =====================================

    const combinedItems = {};

    for (const item of items) {
      if (
        !item.food ||
        item.quantity === undefined
      ) {
        return res.status(400).send({
          message:
            "Food and quantity are required"
        });
      }

      const orderQuantity =
        Number(item.quantity);

      if (
        !Number.isInteger(orderQuantity) ||
        orderQuantity <= 0
      ) {
        return res.status(400).send({
          message:
            "Food quantity must be at least 1"
        });
      }

      const foodId =
        item.food.toString();

      /*
        If the same food appears more
        than once, add the quantities
        together.
      */

      if (combinedItems[foodId]) {
        combinedItems[foodId] +=
          orderQuantity;
      } else {
        combinedItems[foodId] =
          orderQuantity;
      }
    }


    // =====================================
    // BUILD THE FINAL ORDER
    // =====================================

    let totalAmount = 0;
    let vendorId = null;

    const orderItems = [];


    for (
      const [foodId, orderQuantity]
      of Object.entries(combinedItems)
    ) {

      const food =
        await FoodModel.findById(foodId);


      // =====================================
      // FOOD EXISTS?
      // =====================================

      if (!food) {
        return res.status(404).send({
          message: "Food not found"
        });
      }


      // =====================================
      // VENDOR DISABLED FOOD?
      // =====================================

      if (!food.isAvailable) {
        return res.status(400).send({
          message:
            `${food.name} is currently unavailable`
        });
      }


      // =====================================
      // SOLD OUT?
      // =====================================

      if (food.quantity <= 0) {
        return res.status(400).send({
          message:
            `${food.name} is sold out`
        });
      }


      // =====================================
      // ENOUGH STOCK?
      // =====================================

      if (
        food.quantity <
        orderQuantity
      ) {
        return res.status(400).send({
          message:
            `Only ${food.quantity} ${food.name} available`
        });
      }


      // =====================================
      // ONE VENDOR PER ORDER
      // =====================================

      const currentVendorId =
        food.createdBy.toString();


      if (!vendorId) {
        vendorId =
          currentVendorId;
      }


      if (
        vendorId !==
        currentVendorId
      ) {
        return res.status(400).send({
          message:
            "You can only order food from one vendor at a time"
        });
      }


      // =====================================
      // USE CURRENT DATABASE PRICE
      // =====================================

      const currentPrice =
        food.price;


      const subtotal =
        currentPrice *
        orderQuantity;


      totalAmount +=
        subtotal;


      // =====================================
      // SAVE SNAPSHOT
      // =====================================

      orderItems.push({
        food: food._id,

        name:
          food.name,

        price:
          currentPrice,

        quantity:
          orderQuantity,

        subtotal
      });
    }


    // =====================================
    // GENERATE ORDER REFERENCE
    // =====================================

    const orderReference =
      `FOOD-${Date.now()}-${Math.floor(
        1000 +
        Math.random() * 9000
      )}`;


    // =====================================
    // CREATE ORDER
    // =====================================

    const order =
      await FoodOrderModel.create({
        user:
          req.user.id,

        vendor:
          vendorId,

        items:
          orderItems,

        totalAmount,

        orderReference,

        orderStatus:
          "pending",

        paymentStatus:
          "pending"

        /*
          pickupCode is NOT generated here.

          It will only be generated after
          successful payment.
        */
      });


    return res.status(201).send({
      message:
        "Food order created successfully",

      data:
        order
    });

  } catch (error) {
    console.log(
      "CREATE FOOD ORDER ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Food order cannot be created at this time"
    });
  }
};



const getMyFoodOrders = async (req, res) => {
  try {
    const orders = await FoodOrderModel.find({
      user: req.user.id
    })
      .populate(
        "vendor",
        "firstname lastname businessName"
      )
      .populate(
        "items.food",
        "name image category"
      )
      .sort({ createdAt: -1 });

    return res.status(200).send({
      message: "Food orders fetched successfully",
      data: orders
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Cannot fetch food orders at this time"
    });
  }
};


const getFoodOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await FoodOrderModel.findById(
      orderId
    )
      .populate(
        "vendor",
        "firstname lastname businessName phone"
      )
      .populate(
        "items.food",
        "name image category"
      );

    if (!order) {
      return res.status(404).send({
        message: "Food order not found"
      });
    }

    // Customer can only see their own order
    if (
      order.user.toString() !==
      req.user.id.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to view this order"
      });
    }

    return res.status(200).send({
      message: "Food order fetched successfully",
      data: order
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Cannot fetch food order at this time"
    });
  }
};


const getVendorFoodOrders = async (req, res) => {
  try {
    const orders = await FoodOrderModel.find({
      vendor: req.user.id
    })
      .populate(
        "user",
        "firstname lastname email"
      )
      .populate(
        "items.food",
        "name image category"
      )
      .sort({ createdAt: -1 });

    return res.status(200).send({
      message: "Vendor food orders fetched successfully",
      data: orders
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message:
        "Cannot fetch vendor food orders at this time"
    });
  }
};


const getVendorFoodOrderById = async (
  req,
  res
) => {
  try {
    const { orderId } = req.params;

    const order = await FoodOrderModel.findById(
      orderId
    )
      .populate(
        "user",
        "firstname lastname email"
      )
      .populate(
        "items.food",
        "name image category"
      );

    if (!order) {
      return res.status(404).send({
        message: "Food order not found"
      });
    }

    // Vendor can only see orders belonging to them
    if (
      order.vendor.toString() !==
      req.user.id.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to view this order"
      });
    }

    return res.status(200).send({
      message: "Food order fetched successfully",
      data: order
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Cannot fetch food order at this time"
    });
  }
};


const updateFoodOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Vendor can only move orders to:
    // packing or ready
    //
    // completed is handled ONLY
    // through pickup confirmation.
    const allowedStatuses = [
      "packing",
      "ready"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).send({
        message:
          "Status must be packing or ready"
      });
    }

    const order =
      await FoodOrderModel.findById(orderId);

    if (!order) {
      return res.status(404).send({
        message: "Food order not found"
      });
    }

    // =====================================
    // CHECK VENDOR OWNERSHIP
    // =====================================

    if (
      order.vendor.toString() !==
      req.user.id.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to manage this order"
      });
    }

    // =====================================
    // ORDER MUST BE PAID
    // =====================================

    if (order.paymentStatus !== "paid") {
      return res.status(400).send({
        message:
          "Order must be paid before packing can begin"
      });
    }

    // =====================================
    // CANCELLED ORDER
    // =====================================

    if (order.orderStatus === "cancelled") {
      return res.status(400).send({
        message:
          "Cancelled order cannot be updated"
      });
    }

    // =====================================
    // COMPLETED ORDER
    // =====================================

    if (order.orderStatus === "completed") {
      return res.status(400).send({
        message:
          "Completed order cannot be updated"
      });
    }

    // =====================================
    // PENDING -> PACKING
    // =====================================

    if (status === "packing") {
      if (order.orderStatus !== "pending") {
        return res.status(400).send({
          message:
            "Only a pending order can start packing"
        });
      }
    }

    // =====================================
    // PACKING -> READY
    // =====================================

    if (status === "ready") {
      if (order.orderStatus !== "packing") {
        return res.status(400).send({
          message:
            "Order must be packing before it can be marked ready"
        });
      }
    }

    order.orderStatus = status;

    await order.save();

    return res.status(200).send({
      message:
        `Order status updated to ${status}`,
      data: order
    });

  } catch (error) {
    console.log(
      "UPDATE FOOD ORDER STATUS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot update food order status at this time"
    });
  }
};


const cancelFoodOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await FoodOrderModel.findById(orderId);

    if (!order) {
      return res.status(404).send({
        message: "Food order not found"
      });
    }

    // Customer can only cancel their own order
    if (order.user.toString() !== req.user.id.toString()) {
      return res.status(403).send({
        message: "You are not authorized to cancel this order"
      });
    }

    // Already cancelled
    if (order.orderStatus === "cancelled") {
      return res.status(400).send({
        message: "Order is already cancelled"
      });
    }

    // Completed order cannot be cancelled
    if (order.orderStatus === "completed") {
      return res.status(400).send({
        message: "Completed order cannot be cancelled"
      });
    }

    /*
      Once the vendor starts packing the food
      or the order is ready for pickup,
      customer cannot automatically cancel.
    */
    if (
      order.orderStatus === "packing" ||
      order.orderStatus === "ready"
    ) {
      return res.status(400).send({
        message:
          "This order can no longer be cancelled because packing has started"
      });
    }

    // =====================================
    // UNPAID ORDER
    // =====================================

    if (order.paymentStatus === "pending") {
      order.orderStatus = "cancelled";

      await order.save();

      return res.status(200).send({
        message: "Food order cancelled successfully",
        data: order
      });
    }

    // =====================================
    // PAID ORDER
    // =====================================

    if (order.paymentStatus === "paid") {
      const payment = await FoodPaymentModel.findOne({
        order: order._id,
        status: "paid"
      });

      if (!payment) {
        return res.status(404).send({
          message: "Paid food payment record not found"
        });
      }

      // Start refund
      const refundResult = await refundFoodPayment(
        payment,
        "Customer cancelled food order before packing"
      );

      if (!refundResult.success) {
        return res.status(400).send({
          message: refundResult.message
        });
      }

      // =====================================
      // RETURN FOOD STOCK
      // =====================================

      for (const item of order.items) {
        await FoodModel.findByIdAndUpdate(
          item.food,
          {
            $inc: {
              quantity: item.quantity
            }
          }
        );
      }

      // =====================================
      // UPDATE ORDER
      // =====================================

      order.orderStatus = "cancelled";
      order.paymentStatus = "refund_pending";

      await order.save();

      return res.status(200).send({
        message:
          "Food order cancelled and refund initiated successfully",

        data: {
          order,
          payment: refundResult.payment
        }
      });
    }

    // =====================================
    // OTHER PAYMENT STATES
    // =====================================

    if (order.paymentStatus === "refund_pending") {
      return res.status(400).send({
        message: "Refund is already being processed"
      });
    }

    if (order.paymentStatus === "refunded") {
      return res.status(400).send({
        message: "This order has already been refunded"
      });
    }

    return res.status(400).send({
      message: "This food order cannot be cancelled"
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Cannot cancel food order at this time"
    });
  }
};

const verifyFoodPickup = async (req, res) => {
  try {
    const { pickupCode } = req.params;

    if (!pickupCode) {
      return res.status(400).send({
        message: "Pickup code is required"
      });
    }

    const cleanPickupCode =
      pickupCode.trim().toUpperCase();

    // =====================================
    // FIND ORDER
    // =====================================

    const order =
      await FoodOrderModel.findOne({
        pickupCode: cleanPickupCode,

        // Very important:
        // vendor can only verify their
        // own customer's pickup code.
        vendor: req.user.id
      })
        .populate(
          "user",
          "firstname lastname email"
        )
        .populate(
          "items.food",
          "name image category"
        );

    if (!order) {
      return res.status(404).send({
        message:
          "Invalid pickup code for this vendor"
      });
    }

    // =====================================
    // CHECK PAYMENT
    // =====================================

    if (order.paymentStatus !== "paid") {
      return res.status(400).send({
        message:
          "Payment for this order is not confirmed"
      });
    }

    // =====================================
    // CANCELLED
    // =====================================

    if (order.orderStatus === "cancelled") {
      return res.status(400).send({
        message:
          "This food order has been cancelled"
      });
    }

    // =====================================
    // ALREADY COLLECTED
    // =====================================

    if (order.orderStatus === "completed") {
      return res.status(400).send({
        message:
          "This food order has already been collected"
      });
    }

    // =====================================
    // MUST BE READY
    // =====================================

    if (order.orderStatus !== "ready") {
      return res.status(400).send({
        message:
          `Food is not ready for pickup. Current status: ${order.orderStatus}`
      });
    }

    // =====================================
    // VALID PASS
    // =====================================

    return res.status(200).send({
      message:
        "Pickup pass is valid",

      data: {
        customer: order.user,

        orderId: order._id,

        orderReference:
          order.orderReference,

        pickupCode:
          order.pickupCode,

        items:
          order.items,

        totalAmount:
          order.totalAmount,

        paymentStatus:
          order.paymentStatus,

        orderStatus:
          order.orderStatus
      }
    });

  } catch (error) {
    console.log(
      "VERIFY FOOD PICKUP ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot verify food pickup at this time"
    });
  }
};

const confirmFoodPickup = async (req, res) => {
  try {
    const { pickupCode } = req.params;

    if (!pickupCode) {
      return res.status(400).send({
        message: "Pickup code is required"
      });
    }

    const cleanPickupCode =
      pickupCode.trim().toUpperCase();

    /*
      We use findOneAndUpdate so the same
      pickup pass cannot successfully be
      confirmed twice.

      It will ONLY update an order that is:

      - this vendor's order
      - paid
      - currently ready
    */

    const order =
      await FoodOrderModel.findOneAndUpdate(
        {
          pickupCode: cleanPickupCode,
          vendor: req.user.id,
          paymentStatus: "paid",
          orderStatus: "ready"
        },

        {
          $set: {
            orderStatus: "completed",
            collectedAt: new Date()
          }
        },

        {
          new: true
        }
      )
        .populate(
          "user",
          "firstname lastname email"
        )
        .populate(
          "items.food",
          "name image category"
        );

    // =====================================
    // SUCCESS
    // =====================================

    if (order) {
      return res.status(200).send({
        message:
          "Food pickup confirmed successfully",

        data: order
      });
    }

    /*
      If nothing was updated, find the
      order so we can give the correct
      reason.
    */

    const existingOrder =
      await FoodOrderModel.findOne({
        pickupCode: cleanPickupCode,
        vendor: req.user.id
      });

    // =====================================
    // INVALID CODE
    // =====================================

    if (!existingOrder) {
      return res.status(404).send({
        message:
          "Invalid pickup code for this vendor"
      });
    }

    // =====================================
    // ALREADY USED
    // =====================================

    if (
      existingOrder.orderStatus ===
      "completed"
    ) {
      return res.status(400).send({
        message:
          "This pickup pass has already been used"
      });
    }

    // =====================================
    // CANCELLED
    // =====================================

    if (
      existingOrder.orderStatus ===
      "cancelled"
    ) {
      return res.status(400).send({
        message:
          "This food order has been cancelled"
      });
    }

    // =====================================
    // PAYMENT NOT PAID
    // =====================================

    if (
      existingOrder.paymentStatus !==
      "paid"
    ) {
      return res.status(400).send({
        message:
          "Payment for this order is not confirmed"
      });
    }

    // =====================================
    // NOT READY
    // =====================================

    return res.status(400).send({
      message:
        `Food is not ready for pickup. Current status: ${existingOrder.orderStatus}`
    });

  } catch (error) {
    console.log(
      "CONFIRM FOOD PICKUP ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot confirm food pickup at this time"
    });
  }
};

module.exports = {
  createFoodOrder,
  getMyFoodOrders,
  getFoodOrderById,
  getVendorFoodOrders,
  getVendorFoodOrderById,
  updateFoodOrderStatus,
 cancelFoodOrder,
  verifyFoodPickup,
  confirmFoodPickup
};