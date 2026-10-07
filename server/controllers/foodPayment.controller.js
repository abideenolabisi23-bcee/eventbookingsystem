const mongoose = require("mongoose");
const crypto = require("crypto");
const FoodModel = require("../models/food.model");
const FoodOrderModel = require("../models/foodOrder.model");
const FoodPaymentModel = require("../models/foodPayment.model");
const refundFoodPayment = require("../utils/refundFoodPayment");



const checkOrderStock = async (order) => {
  for (const item of order.items) {
    const food = await FoodModel.findById(item.food);

    if (!food) {
      return {
        available: false,
        message: `${item.name} no longer exists`
      };
    }

    if (!food.isAvailable) {
      return {
        available: false,
        message: `${food.name} is currently unavailable`
      };
    }

    if (food.quantity < item.quantity) {
      return {
        available: false,
        message: `Only ${food.quantity} ${food.name} available`
      };
    }
  }

  return {
    available: true
  };
};

const returnFoodStock = async (items) => {
  for (const item of items) {
    await FoodModel.findByIdAndUpdate(
      item.food,
      {
        $inc: {
          quantity: item.quantity
        }
      }
    );
  }
};

const deductFoodStock = async (order) => {
  const session =
    await mongoose.startSession();

  try {

    session.startTransaction();


    for (const item of order.items) {

      const food =
        await FoodModel.findOneAndUpdate(
          {
            _id: item.food,

            /*
              Food must still be displayed/
              enabled by vendor.
            */
            isAvailable: true,

            /*
              There must still be enough
              portions at the exact moment
              payment is processed.
            */
            quantity: {
              $gte: item.quantity
            }
          },

          {
            $inc: {
              quantity: -item.quantity
            }
          },

          {
            new: true,
            session
          }
        );


      if (!food) {

        await session.abortTransaction();

        return {
          success: false,
          message:
            `${item.name} does not have enough stock or is currently unavailable`
        };
      }


      /*
        IMPORTANT:

        DO NOT set isAvailable = false
        when quantity reaches 0.

        quantity 0 means SOLD OUT.

        isAvailable false means the vendor
        intentionally removed the food.
      */
    }


    await session.commitTransaction();


    return {
      success: true
    };

  } catch (error) {

    await session.abortTransaction();


    console.log(
      "FOOD STOCK TRANSACTION ERROR:",
      error
    );


    return {
      success: false,
      message:
        "Food stock could not be updated"
    };

  } finally {

    await session.endSession();
  }
};

const confirmFoodPayment = async (
  reference,
  paystackData
) => {
  try {
    // ==========================================
    // FIND PAYMENT
    // ==========================================

    let payment =
      await FoodPaymentModel.findOne({
        reference
      });

    if (!payment) {
      return {
        success: false,
        statusCode: 404,
        message: "Food payment not found"
      };
    }

    // ==========================================
    // FIND ORDER
    // ==========================================

    let order =
      await FoodOrderModel.findById(
        payment.order
      );

    if (!order) {
      return {
        success: false,
        statusCode: 404,
        message: "Food order not found"
      };
    }

    // ==========================================
    // ALREADY COMPLETED
    // ==========================================

    if (
      payment.status === "paid" &&
      order.paymentStatus === "paid"
    ) {
      return {
        success: true,
        statusCode: 200,
        message:
          "Food payment already confirmed",
        order,
        payment
      };
    }

    // ==========================================
    // REFUND ALREADY STARTED
    // ==========================================

    if (
      payment.status === "refund_pending" ||
      payment.status === "refunded"
    ) {
      return {
        success: false,
        statusCode: 409,
        message:
          "This payment is already in the refund process",
        order,
        payment
      };
    }

    // ==========================================
    // PAYSTACK MUST SAY SUCCESS
    // ==========================================

    if (paystackData.status !== "success") {
      payment.status = "failed";

      await payment.save();

      order.paymentStatus = "failed";

      await order.save();

      return {
        success: false,
        statusCode: 400,
        message:
          "Payment was not successful"
      };
    }

    // ==========================================
    // VERIFY AMOUNT
    // ==========================================

    const expectedAmount =
      Math.round(payment.amount * 100);

    if (
      Number(paystackData.amount) !==
      expectedAmount
    ) {
      return {
        success: false,
        statusCode: 409,
        paymentRequiresAttention: true,
        message:
          "Paid amount does not match the expected food order amount"
      };
    }

    // ==========================================
    // ATOMIC PROCESSING LOCK
    // ==========================================
    //
    // Only ONE request can change:
    //
    // pending -> processing
    //
    // If webhook gets here first,
    // /verify cannot process the same payment.
    //
    // If /verify gets here first,
    // webhook cannot process it again.
    // ==========================================

    const lockedPayment =
      await FoodPaymentModel.findOneAndUpdate(
        {
          _id: payment._id,
          status: "pending"
        },
        {
          $set: {
            status: "processing"
          }
        },
        {
          returnDocument: "after"
        }
      );

    // ==========================================
    // ANOTHER REQUEST ALREADY GOT THE LOCK
    // ==========================================

    if (!lockedPayment) {
      payment =
        await FoodPaymentModel.findById(
          payment._id
        );

      order =
        await FoodOrderModel.findById(
          order._id
        );

      if (
        payment.status === "paid" &&
        order.paymentStatus === "paid"
      ) {
        return {
          success: true,
          statusCode: 200,
          message:
            "Food payment already confirmed",
          order,
          payment
        };
      }

      if (
        payment.status ===
          "refund_pending" ||
        payment.status === "refunded"
      ) {
        return {
          success: false,
          statusCode: 409,
          message:
            "This payment is already in the refund process",
          order,
          payment
        };
      }

      if (payment.status === "processing") {
        return {
          success: true,
          statusCode: 202,
          message:
            "Food payment is already being processed",
          order,
          payment
        };
      }

      return {
        success: false,
        statusCode: 409,
        message:
          "Food payment cannot be processed again",
        order,
        payment
      };
    }

    payment = lockedPayment;

    // ==========================================
    // DEDUCT STOCK
    // ==========================================

    const stockResult =
      await deductFoodStock(order);

    // ==========================================
    // CUSTOMER PAID BUT STOCK IS GONE
    // ==========================================

    if (!stockResult.success) {
      // Paystack collected the customer's
      // money, so record payment as paid first.

      payment.status = "paid";
      payment.paidAt = new Date();

      await payment.save();

      order.orderStatus = "cancelled";
      order.paymentStatus = "paid";

      await order.save();

      // ========================================
      // AUTOMATIC FULL REFUND
      // ========================================

      const refundResult =
        await refundFoodPayment(
          payment,
          `Food unavailable after payment: ${stockResult.message}`
        );

      if (refundResult.success) {
        order.paymentStatus =
          "refund_pending";

        await order.save();

        return {
          success: false,
          statusCode: 409,
          refundInitiated: true,

          message:
            `${stockResult.message}. Payment was received, but the order cannot be fulfilled. A full refund has been initiated.`,

          order,
          payment: refundResult.payment
        };
      }

      return {
        success: false,
        statusCode: 500,
        refundRequiresAttention: true,

        message:
          `${stockResult.message}. Payment was received, but the automatic refund could not be initiated.`,

        order,
        payment
      };
    }

    // ==========================================
    // GENERATE PICKUP CODE
    // ==========================================

    let pickupCode =
      order.pickupCode;

    if (!pickupCode) {
      let codeExists = true;

      while (codeExists) {
        pickupCode =
          `FOOD-${Math.floor(
            100000 +
              Math.random() * 900000
          )}`;

        codeExists =
          await FoodOrderModel.exists({
            pickupCode
          });
      }
    }

    // ==========================================
    // PAYMENT SUCCESSFUL
    // ==========================================

    payment.status = "paid";
    payment.paidAt =
      payment.paidAt || new Date();

    await payment.save();

    order.paymentStatus = "paid";
    order.pickupCode = pickupCode;

    await order.save();

    return {
      success: true,
      statusCode: 200,
      message:
        "Food payment confirmed successfully",
      order,
      payment
    };

  } catch (error) {
    console.log(
      "CONFIRM FOOD PAYMENT ERROR:",
      error
    );

    
    return {
      success: false,
      statusCode: 500,
      paymentRequiresAttention: true,
      message:
        "Food payment processing requires verification"
    };
  }
};

const initializeFoodPayment = async (
  req,
  res
) => {
  try {
    const { orderId } = req.body;

    // ==========================================
    // VALIDATE ORDER ID
    // ==========================================

    if (!orderId) {
      return res.status(400).send({
        message: "Order ID is required"
      });
    }

    // ==========================================
    // FIND ORDER
    // ==========================================

    const order =
      await FoodOrderModel.findById(
        orderId
      );

    if (!order) {
      return res.status(404).send({
        message: "Food order not found"
      });
    }

    // ==========================================
    // CUSTOMER CAN ONLY PAY OWN ORDER
    // ==========================================

    if (
      order.user.toString() !==
      req.user.id.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to pay for this order"
      });
    }

    // ==========================================
    // CANCELLED ORDER
    // ==========================================

    if (order.orderStatus === "cancelled") {
      return res.status(400).send({
        message:
          "Cancelled order cannot be paid"
      });
    }

    // ==========================================
    // ALREADY PAID
    // ==========================================

    if (order.paymentStatus === "paid") {
      return res.status(400).send({
        message:
          "Order has already been paid"
      });
    }

    // ==========================================
    // REFUND
    // ==========================================

    if (
      order.paymentStatus ===
        "refund_pending" ||
      order.paymentStatus === "refunded"
    ) {
      return res.status(400).send({
        message:
          "This order is already in the refund process"
      });
    }

    // ==========================================
    // CHECK FOR EXISTING ACTIVE PAYMENT
    // ==========================================

    const existingPayment =
      await FoodPaymentModel.findOne({
        order: order._id,

        status: {
          $in: [
            "pending",
            "processing",
            "paid",
            "refund_pending",
            "refunded"
          ]
        }
      }).sort({
        createdAt: -1
      });

    if (existingPayment) {
      if (
        existingPayment.status === "paid"
      ) {
        return res.status(400).send({
          message:
            "This food order has already been paid"
        });
      }

      if (
        existingPayment.status ===
          "processing"
      ) {
        return res.status(409).send({
          message:
            "This food payment is already being processed"
        });
      }

      if (
        existingPayment.status ===
          "refund_pending" ||
        existingPayment.status ===
          "refunded"
      ) {
        return res.status(409).send({
          message:
            "This food order is already in the refund process"
        });
      }

      if (
        existingPayment.status ===
        "pending"
      ) {
        return res.status(409).send({
          message:
            "A payment has already been initialized for this food order",

          data: {
            reference:
              existingPayment.reference
          }
        });
      }
    }

    // ==========================================
    // CHECK STOCK BEFORE PAYSTACK
    // ==========================================

    const stockCheck =
      await checkOrderStock(order);

    if (!stockCheck.available) {
      return res.status(400).send({
        message: stockCheck.message
      });
    }

    // ==========================================
    // GET CUSTOMER EMAIL
    // ==========================================

    const populatedOrder =
      await FoodOrderModel
        .findById(orderId)
        .populate(
          "user",
          "email"
        );

    if (
      !populatedOrder.user ||
      !populatedOrder.user.email
    ) {
      return res.status(400).send({
        message:
          "Customer email not found"
      });
    }

    // ==========================================
    // GENERATE REFERENCE
    // ==========================================

    const reference =
      `FOOD-PAY-${Date.now()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

    // ==========================================
    // CREATE PAYMENT RECORD
    // ==========================================

    let payment;

    try {
      payment =
        await FoodPaymentModel.create({
          user: req.user.id,
          order: order._id,
          amount: order.totalAmount,
          reference,
          status: "pending"
        });
    } catch (error) {
      /*
        If two Pay button requests arrive
        at almost exactly the same time,
        the unique active-payment index
        protects us.
      */

      if (error.code === 11000) {
        return res.status(409).send({
          message:
            "A payment has already been initialized for this food order"
        });
      }

      throw error;
    }

    // ==========================================
    // INITIALIZE PAYSTACK
    // ==========================================

    const paystackResponse =
      await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

            "Content-Type":
              "application/json"
          },

        body: JSON.stringify({
  email:
    populatedOrder.user.email,

  amount:
    Math.round(
      order.totalAmount * 100
    ),

  reference,

  callback_url:
    "https://eventbookingsystem-gkh7.vercel.app/food-payment/callback",

  metadata: {
    type: "food",

    orderId:
      order._id.toString(),

    userId:
      req.user.id.toString()
  }
})
        }
      );

    const paystackResult =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackResult.status
    ) {
      payment.status = "failed";

      await payment.save();

      return res.status(400).send({
        message:
          paystackResult.message ||
          "Cannot initialize food payment"
      });
    }

    return res.status(200).send({
      message:
        "Food payment initialized successfully",

      data: {
        authorizationUrl:
          paystackResult.data
            .authorization_url,

        accessCode:
          paystackResult.data
            .access_code,

        reference:
          paystackResult.data
            .reference,

        amount:
          order.totalAmount
      }
    });

  } catch (error) {
    console.log(
      "INITIALIZE FOOD PAYMENT ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot initialize food payment at this time"
    });
  }
};

const verifyFoodPayment = async (
  req,
  res
) => {
  try {

    const { reference } = req.params;


    const payment =
      await FoodPaymentModel.findOne({
        reference
      });


    if (!payment) {
      return res.status(404).send({
        message:
          "Food payment not found"
      });
    }


    if (
      payment.user.toString() !==
      req.user.id.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to verify this payment"
      });
    }


    // =====================================
    // ALREADY PAID
    // =====================================

   // =====================================
// ALREADY PAID
// =====================================

if (payment.status === "paid") {

  const order =
    await FoodOrderModel.findById(
      payment.order
    );

  if (!order) {
    return res.status(404).send({
      message: "Food order not found"
    });
  }

  // =====================================
  // INCONSISTENT REFUND STATE
  // =====================================

  if (
    order.paymentStatus === "refunded" ||
    order.paymentStatus === "refund_pending"
  ) {
    return res.status(409).send({
      message:
        "Food payment and order refund status are inconsistent. Please verify the refund.",

      refundRequiresReconciliation: true,

      data: {
        order,
        payment
      }
    });
  }

  return res.status(200).send({
    message:
      "Food payment already confirmed",

    data: {
      order,
      payment
    }
  });
}


    // =====================================
    // REFUND PROCESS
    // =====================================

    if (
      payment.status ===
        "refund_pending" ||
      payment.status === "refunded"
    ) {

      const order =
        await FoodOrderModel.findById(
          payment.order
        );


      return res.status(200).send({
        message:
          "Food payment is in the refund process",

        data: {
          order,
          payment
        }
      });
    }


    // =====================================
    // VERIFY WITH PAYSTACK
    // =====================================

    const paystackResponse =
      await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(
          reference
        )}`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );


    const paystackResult =
      await paystackResponse.json();


    if (
      !paystackResponse.ok ||
      !paystackResult.status
    ) {
      return res.status(400).send({
        message:
          paystackResult.message ||
          "Cannot verify food payment"
      });
    }


    const result =
      await confirmFoodPayment(
        reference,
        paystackResult.data
      );


    return res
      .status(result.statusCode)
      .send({
        message: result.message,

        ...(result.order && {
          data: {
            order: result.order,
            payment: result.payment
          }
        }),

        ...(result.refundInitiated && {
          refundInitiated: true
        }),

        ...(result.refundRequiresAttention && {
          refundRequiresAttention: true
        }),

        ...(result.paymentRequiresAttention && {
          paymentRequiresAttention: true
        })
      });

  } catch (error) {

    console.log(error);

    return res.status(500).send({
      message:
        "Cannot verify food payment at this time"
    });
  }
};

const foodPaymentWebhook = async (req, res) => {
  try {
    // =====================================
    // VERIFY PAYSTACK SIGNATURE
    // =====================================

    const hash = crypto
      .createHmac(
        "sha512",
        process.env.PAYSTACK_SECRET_KEY
      )
      .update(req.rawBody)
      .digest("hex");

    if (
      hash !==
      req.headers["x-paystack-signature"]
    ) {
      return res.sendStatus(401);
    }

    const event = req.body;

    console.log(
      "PAYSTACK WEBHOOK EVENT:",
      event.event
    );

    console.log(
      "PAYSTACK WEBHOOK DATA:",
      event.data
    );

    // =====================================
    // SUCCESSFUL FOOD PAYMENT
    // =====================================

    if (event.event === "charge.success") {
      const data = event.data;

      if (
        !data ||
        !data.reference ||
        !data.metadata ||
        data.metadata.type !== "food"
      ) {
        return res.sendStatus(200);
      }

      const result =
        await confirmFoodPayment(
          data.reference,
          data
        );

      if (
        result.refundRequiresAttention ||
        result.paymentRequiresAttention
      ) {
        console.log(
          "FOOD PAYMENT REQUIRES ATTENTION:",
          data.reference
        );
      }

      return res.sendStatus(200);
    }

    // =====================================
    // REFUND PENDING
    // =====================================

    if (event.event === "refund.pending") {
      const data = event.data;

      const originalReference =
        data?.transaction_reference ||
        data?.transaction?.reference;

      if (!originalReference) {
        console.log(
          "Refund pending webhook has no transaction reference"
        );

        return res.sendStatus(200);
      }

      const payment =
        await FoodPaymentModel.findOne({
          reference: originalReference
        });

      if (!payment) {
        console.log(
          "Food payment not found for refund:",
          originalReference
        );

        return res.sendStatus(200);
      }

      // Already completely refunded
      if (payment.status === "refunded") {
        return res.sendStatus(200);
      }

      payment.status = "refund_pending";

      payment.refundAmount =
        Number(data.amount)
          ? Number(data.amount) / 100
          : payment.amount;

      if (
        data.refund_reference ||
        data.id
      ) {
        payment.refundReference =
          data.refund_reference ||
          data.id.toString();
      }

      await payment.save();

      const order =
        await FoodOrderModel.findById(
          payment.order
        );

      if (order) {
        order.paymentStatus =
          "refund_pending";

        order.orderStatus = "cancelled";

        await order.save();
      }

      console.log(
        "Food refund pending:",
        originalReference
      );

      return res.sendStatus(200);
    }

    // =====================================
    // REFUND COMPLETED
    // =====================================

    if (event.event === "refund.processed") {
      const data = event.data;

      const originalReference =
        data?.transaction_reference ||
        data?.transaction?.reference;

      if (!originalReference) {
        console.log(
          "Refund processed webhook has no transaction reference"
        );

        return res.sendStatus(200);
      }

      const payment =
        await FoodPaymentModel.findOne({
          reference: originalReference
        });

      if (!payment) {
        console.log(
          "Food payment not found for completed refund:",
          originalReference
        );

        return res.sendStatus(200);
      }

      // =====================================
      // IDEMPOTENCY
      // =====================================

      if (payment.status === "refunded") {
        return res.sendStatus(200);
      }

      payment.status = "refunded";

      payment.refundAmount =
        Number(data.amount)
          ? Number(data.amount) / 100
          : payment.amount;

      payment.refundReference =
        data.refund_reference ||
        payment.refundReference ||
        data.id?.toString() ||
        null;

      payment.refundedAt = new Date();

      await payment.save();

      const order =
        await FoodOrderModel.findById(
          payment.order
        );

      if (order) {
        order.paymentStatus = "refunded";
        order.orderStatus = "cancelled";

        await order.save();
      }

      console.log(
        "Food refund completed:",
        originalReference
      );

      return res.sendStatus(200);
    }

    // =====================================
    // IGNORE OTHER PAYSTACK EVENTS
    // =====================================

    return res.sendStatus(200);

  } catch (error) {
    console.log(
      "FOOD WEBHOOK ERROR:",
      error
    );

    return res.sendStatus(500);
  }
};

const reconcileFoodRefund = async (req, res) => {
  try {
    const { orderId } = req.params;

    // ==========================================
    // FIND FOOD ORDER
    // ==========================================

    const order =
      await FoodOrderModel.findById(orderId);

    if (!order) {
      return res.status(404).send({
        message: "Food order not found"
      });
    }

    // Customer can only check their own order
    if (
      order.user.toString() !==
      req.user.id.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to verify this refund"
      });
    }

    // ==========================================
    // FIND PAYMENT
    // ==========================================

    const payment =
      await FoodPaymentModel.findOne({
        order: order._id
      });

    if (!payment) {
      return res.status(404).send({
        message: "Food payment not found"
      });
    }

    // ==========================================
    // ALREADY REFUNDED
    // ==========================================

    if (
      payment.status === "refunded" &&
      order.paymentStatus === "refunded"
    ) {
      return res.status(200).send({
        message:
          "Food refund already completed",
        data: {
          order,
          payment
        }
      });
    }

    // ==========================================
    // REFUND MUST HAVE BEEN STARTED
    // ==========================================

   // ==========================================
// PAYMENT ALREADY REFUNDED
// BUT ORDER WAS NOT UPDATED
// ==========================================

if (payment.status === "refunded") {
  order.paymentStatus = "refunded";
  order.orderStatus = "cancelled";

  await order.save();

  if (!payment.refundedAt) {
    payment.refundedAt = new Date();
    await payment.save();
  }

  return res.status(200).send({
    message:
      "Food refund reconciled successfully",

    data: {
      order,
      payment
    }
  });
}

// ==========================================
// REFUND HAS NOT STARTED
// ==========================================

if (payment.status !== "refund_pending") {
  return res.status(400).send({
    message:
      "This payment does not have a pending refund"
  });
}

    // ==========================================
    // GET ORIGINAL TRANSACTION FROM PAYSTACK
    // ==========================================

    const transactionResponse =
      await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(
          payment.reference
        )}`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

    const transactionResult =
      await transactionResponse.json();

    if (
      !transactionResponse.ok ||
      !transactionResult.status
    ) {
      return res.status(400).send({
        message:
          transactionResult.message ||
          "Unable to verify payment with Paystack"
      });
    }

    // ==========================================
    // GET REFUNDS FROM PAYSTACK
    // ==========================================

    const refundResponse =
      await fetch(
        "https://api.paystack.co/refund",
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

    const refundResult =
      await refundResponse.json();

    if (
      !refundResponse.ok ||
      !refundResult.status
    ) {
      return res.status(400).send({
        message:
          refundResult.message ||
          "Unable to verify refund with Paystack"
      });
    }

    // ==========================================
    // FIND THIS PAYMENT'S REFUND
    // ==========================================

    const refunds =
      Array.isArray(refundResult.data)
        ? refundResult.data
        : [];

    const matchingRefund =
      refunds.find((refund) => {
        const originalReference =
          refund.transaction_reference ||
          refund.transaction?.reference;

        return (
          originalReference ===
            payment.reference ||
          String(refund.id) ===
            String(payment.refundReference)
        );
      });

    if (!matchingRefund) {
      return res.status(200).send({
        message:
          "Refund has not been confirmed by Paystack yet",
        data: {
          paymentStatus:
            payment.status,
          orderStatus:
            order.orderStatus
        }
      });
    }

    console.log(
      "PAYSTACK FOOD REFUND STATUS:",
      matchingRefund.status
    );

    // ==========================================
    // REFUND COMPLETED
    // ==========================================

    if (
      matchingRefund.status ===
      "processed"
    ) {
      payment.status = "refunded";

      payment.refundAmount =
        matchingRefund.amount
          ? matchingRefund.amount / 100
          : payment.amount;

      payment.refundReference =
        matchingRefund.refund_reference ||
        String(matchingRefund.id) ||
        payment.refundReference;

      payment.refundedAt =
        matchingRefund.refunded_at
          ? new Date(
              matchingRefund.refunded_at
            )
          : new Date();

      await payment.save();

      order.paymentStatus =
        "refunded";

      order.orderStatus =
        "cancelled";

      await order.save();

      return res.status(200).send({
        message:
          "Food refund verified and completed successfully",

        data: {
          order,
          payment
        }
      });
    }

    // ==========================================
    // REFUND FAILED
    // ==========================================

    if (
      matchingRefund.status === "failed"
    ) {
      payment.status = "paid";

      await payment.save();

      order.paymentStatus = "paid";

      await order.save();

      return res.status(400).send({
        message:
          "Paystack reports that this refund failed",

        data: {
          order,
          payment
        }
      });
    }

    // ==========================================
    // STILL PENDING / PROCESSING
    // ==========================================

    payment.status =
      "refund_pending";

    await payment.save();

    order.paymentStatus =
      "refund_pending";

    order.orderStatus =
      "cancelled";

    await order.save();

    return res.status(200).send({
      message:
        "Food refund is still being processed by Paystack",

      data: {
        refundStatus:
          matchingRefund.status,

        order,
        payment
      }
    });
  } catch (error) {
    console.log(
      "FOOD REFUND RECONCILIATION ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot verify food refund at this time"
    });
  }
};

module.exports = {
  initializeFoodPayment,
  verifyFoodPayment,
  foodPaymentWebhook,
  reconcileFoodRefund
};