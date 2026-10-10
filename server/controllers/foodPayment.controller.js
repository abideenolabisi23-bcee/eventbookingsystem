const mongoose = require("mongoose");
const getPaymentCallbackUrl = require("../utils/paymentCallback");
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

const confirmFoodPayment = async (reference, paystackData) => {
  try {
    let payment = await FoodPaymentModel.findOne({
      reference
    });

    if (!payment) {
      return {
        success: false,
        statusCode: 404,
        message: "Food payment not found"
      };
    }

    let order = await FoodOrderModel.findById(
      payment.order
    );

    if (!order) {
      return {
        success: false,
        statusCode: 404,
        message: "Food order not found"
      };
    }

    if (
      payment.status === "paid" &&
      order.paymentStatus === "paid"
    ) {
      return {
        success: true,
        statusCode: 200,
        message: "Food payment already confirmed",
        order,
        payment
      };
    }

    if (
      payment.status === "refund_pending" ||
      payment.status === "refunded"
    ) {
      return {
        success: false,
        statusCode: 409,
        message: "This payment is already in the refund process",
        order,
        payment
      };
    }

    if (paystackData.status !== "success") {
      if (
        paystackData.status === "failed" ||
        paystackData.status === "abandoned" ||
        paystackData.status === "reversed"
      ) {
        const failedPayment =
          await FoodPaymentModel.findOneAndUpdate(
            {
              _id: payment._id,
              status: "pending"
            },
            {
              $set: {
                status: "failed"
              }
            },
            {
              returnDocument: "after"
            }
          );

        if (failedPayment) {
          await FoodOrderModel.updateOne(
            {
              _id: order._id,
              paymentStatus: "pending"
            },
            {
              $set: {
                paymentStatus: "failed"
              }
            }
          );
        }

        return {
          success: false,
          statusCode: 400,
          message: "Food payment was not successful"
        };
      }

      return {
        success: false,
        statusCode: 202,
        paymentRequiresAttention: true,
        message:
          "Food payment is still pending confirmation. Please do not pay again.",
        order,
        payment
      };
    }

    const expectedAmount = Math.round(
      payment.amount * 100
    );

    if (
      Number(paystackData.amount) !== expectedAmount
    ) {
      return {
        success: false,
        statusCode: 409,
        paymentRequiresAttention: true,
        message:
          "Paid amount does not match the expected food order amount",
        order,
        payment
      };
    }

    const lockedPayment =
  await FoodPaymentModel.findOneAndUpdate(
    {
      _id: payment._id,
      status: "pending"
    },
    {
      $set: {
        status: "processing",
        processingStartedAt: new Date()
      }
    },
    {
      returnDocument: "after"
    }
  );

    if (!lockedPayment) {
      payment = await FoodPaymentModel.findById(
        payment._id
      );

      order = await FoodOrderModel.findById(
        order._id
      );

      if (!payment || !order) {
        return {
          success: false,
          statusCode: 404,
          message:
            "Food payment or order could not be found"
        };
      }

      if (
        payment.status === "paid" &&
        order.paymentStatus === "paid"
      ) {
        return {
          success: true,
          statusCode: 200,
          message: "Food payment already confirmed",
          order,
          payment
        };
      }

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

    const stockResult = await deductFoodStock(order);

    if (!stockResult.success) {
      payment.status = "paid";
      payment.paidAt = new Date();

      await payment.save();

      order.orderStatus = "cancelled";
      order.paymentStatus = "paid";

      await order.save();

      const refundResult = await refundFoodPayment(
        payment,
        `Food unavailable after payment: ${stockResult.message}`
      );

      if (refundResult.success) {
        order.paymentStatus = "refund_pending";

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

    let pickupCode = order.pickupCode;

    if (!pickupCode) {
      let codeExists = true;

      while (codeExists) {
        pickupCode = `FOOD-${Math.floor(
          100000 + Math.random() * 900000
        )}`;

        codeExists = await FoodOrderModel.exists({
          pickupCode
        });
      }
    }

    payment.status = "paid";
    payment.paidAt = payment.paidAt || new Date();

    await payment.save();

    order.paymentStatus = "paid";
    order.pickupCode = pickupCode;

    await order.save();

    return {
      success: true,
      statusCode: 200,
      message: "Food payment confirmed successfully",
      order,
      payment
    };
  } catch (error) {
    console.error(
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



const initializeFoodPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).send({
        message: "A valid order ID is required"
      });
    }

    const order = await FoodOrderModel.findById(orderId);

    if (!order) {
      return res.status(404).send({
        message: "Food order not found"
      });
    }

    if (String(order.user) !== String(req.user.id)) {
      return res.status(403).send({
        message: "You are not authorized to pay for this order"
      });
    }

    if (order.orderStatus === "cancelled") {
      return res.status(400).send({
        message: "Cancelled orders cannot be paid"
      });
    }

    if (order.paymentStatus === "paid") {
      return res.status(409).send({
        message: "This order has already been paid"
      });
    }

    if (
      ["refund_pending", "refunded"].includes(
        order.paymentStatus
      )
    ) {
      return res.status(409).send({
        message: "This order is already in the refund process"
      });
    }

    if (
      !Number.isSafeInteger(
        Math.round(Number(order.totalAmount) * 100)
      ) ||
      Number(order.totalAmount) <= 0
    ) {
      return res.status(400).send({
        message: "Invalid order amount"
      });
    }

    const existingPayment = await FoodPaymentModel.findOne({
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
    }).sort({ createdAt: -1 });

    if (existingPayment) {
      if (existingPayment.status === "paid") {
        return res.status(409).send({
          message: "This order has already been paid"
        });
      }

      if (existingPayment.status === "processing") {
        return res.status(409).send({
          message: "Your payment is being confirmed. Please wait.",
          data: {
            reference: existingPayment.reference
          }
        });
      }

      if (
        ["refund_pending", "refunded"].includes(
          existingPayment.status
        )
      ) {
        return res.status(409).send({
          message: "This payment is in the refund process"
        });
      }

      if (existingPayment.status === "pending") {
        if (
          Number(existingPayment.amount) !==
          Number(order.totalAmount)
        ) {
          return res.status(409).send({
            message:
              "The saved payment amount does not match the order. Please contact support."
          });
        }

        if (!existingPayment.authorizationUrl) {
          return res.status(409).send({
            message:
              "Your previous payment is still being initialized. Please wait before trying again.",
            data: {
              reference: existingPayment.reference
            }
          });
        }

        let paystackResult;

        try {
          const verifyResponse = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(
              existingPayment.reference
            )}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
              }
            }
          );

          paystackResult = await verifyResponse.json();

          if (
            !verifyResponse.ok ||
            !paystackResult.status ||
            !paystackResult.data
          ) {
            return res.status(409).send({
              message:
                "We could not confirm your previous payment status. Please try again shortly.",
              data: {
                reference: existingPayment.reference
              }
            });
          }
        } catch (error) {
          console.error("PAYSTACK PAYMENT CHECK ERROR:", error);

          return res.status(503).send({
            message:
              "Paystack is temporarily unavailable. Please try again shortly."
          });
        }

        const paystackStatus = paystackResult.data.status;

        if (paystackStatus === "success") {
          return res.status(409).send({
            message:
              "Paystack reports this payment as successful. Please verify your payment instead of paying again.",
            data: {
              reference: existingPayment.reference
            }
          });
        }

        if (paystackStatus !== "abandoned" &&
            paystackStatus !== "ongoing" &&
            paystackStatus !== "pending") {
          return res.status(409).send({
            message:
              "Your previous payment requires review before another payment can be started.",
            data: {
              reference: existingPayment.reference
            }
          });
        }

        return res.status(200).send({
          message: "Existing food payment resumed successfully",
          data: {
            authorizationUrl: existingPayment.authorizationUrl,
            accessCode: existingPayment.accessCode,
            reference: existingPayment.reference,
            amount: existingPayment.amount,
            resumed: true
          }
        });
      }
    }

    const stockCheck = await checkOrderStock(order);

    if (!stockCheck.available) {
      return res.status(400).send({
        message: stockCheck.message
      });
    }

    const populatedOrder = await FoodOrderModel.findById(
      order._id
    ).populate("user", "email");

    const customerEmail = populatedOrder?.user?.email;

    if (!customerEmail) {
      return res.status(400).send({
        message: "Customer email not found"
      });
    }

    const reference = `FOOD-PAY-${Date.now()}-${crypto
      .randomBytes(6)
      .toString("hex")}`;

    let payment;

    try {
      payment = await FoodPaymentModel.create({
        user: req.user.id,
        order: order._id,
        amount: order.totalAmount,
        reference,
        status: "pending"
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).send({
          message:
            "Another payment request is already in progress. Please wait and try again."
        });
      }

      throw error;
    }

    let paystackResponse;
    let paystackResult;

    try {
      paystackResponse = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: customerEmail,
            amount: Math.round(Number(order.totalAmount) * 100),
            reference,
            callback_url: getPaymentCallbackUrl(
              req,
              "/food-payment/callback"
            ),
            metadata: {
              type: "food",
              orderId: String(order._id),
              userId: String(req.user.id)
            }
          })
        }
      );

      paystackResult = await paystackResponse.json();
    } catch (error) {
      console.error("PAYSTACK INITIALIZATION ERROR:", error);

      return res.status(503).send({
        message:
          "Paystack did not respond. Your payment reference has been reserved to prevent duplicate charges. Please contact support if this persists.",
        data: {
          reference
        }
      });
    }

    if (
      !paystackResponse.ok ||
      !paystackResult.status
    ) {
      await FoodPaymentModel.updateOne(
        {
          _id: payment._id,
          status: "pending"
        },
        {
          $set: {
            status: "failed"
          }
        }
      );

      return res.status(400).send({
        message:
          paystackResult.message ||
          "Cannot initialize food payment"
      });
    }

    const authorizationUrl =
      paystackResult.data?.authorization_url;

    const accessCode = paystackResult.data?.access_code;

    if (
      !authorizationUrl ||
      !accessCode ||
      paystackResult.data?.reference !== reference
    ) {
      return res.status(502).send({
        message:
          "Paystack returned incomplete payment information. Please contact support with your payment reference.",
        data: {
          reference
        }
      });
    }

    const savedPayment = await FoodPaymentModel.findOneAndUpdate(
      {
        _id: payment._id,
        status: "pending"
      },
      {
        $set: {
          authorizationUrl,
          accessCode,
          initializedAt: new Date()
        }
      },
      {
        new: true
      }
    );

    if (!savedPayment) {
      return res.status(409).send({
        message:
          "The payment status changed while checkout was being prepared. Please verify the payment before continuing.",
        data: {
          reference
        }
      });
    }

    return res.status(200).send({
      message: "Food payment initialized successfully",
      data: {
        authorizationUrl: savedPayment.authorizationUrl,
        accessCode: savedPayment.accessCode,
        reference: savedPayment.reference,
        amount: savedPayment.amount,
        resumed: false
      }
    });
  } catch (error) {
    console.error("INITIALIZE FOOD PAYMENT ERROR:", error);

    return res.status(500).send({
      message: "Cannot initialize food payment at this time"
    });
  }
};


const verifyFoodPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).send({
        message: "Payment reference is required"
      });
    }

    const payment = await FoodPaymentModel.findOne({
      reference
    });

    if (!payment) {
      return res.status(404).send({
        message: "Food payment not found"
      });
    }

    if (
      payment.user.toString() !==
      req.user.id.toString()
    ) {
      return res.status(403).send({
        message: "You are not authorized to verify this payment"
      });
    }

    if (payment.status === "paid") {
      const order = await FoodOrderModel.findById(
        payment.order
      );

      if (!order) {
        return res.status(404).send({
          message: "Food order not found"
        });
      }

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

      if (order.paymentStatus !== "paid") {
        return res.status(409).send({
          message:
            "Payment is marked as paid, but the food order has not been confirmed. Please do not pay again.",
          paymentRequiresAttention: true,
          data: {
            order,
            payment
          }
        });
      }

      return res.status(200).send({
        message: "Food payment already confirmed",
        data: {
          order,
          payment
        }
      });
    }

    if (
      payment.status === "refund_pending" ||
      payment.status === "refunded"
    ) {
      const order = await FoodOrderModel.findById(
        payment.order
      );

      return res.status(200).send({
        message: "Food payment is in the refund process",
        data: {
          order,
          payment
        }
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).send({
        message: "Food payment service is not configured"
      });
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const paystackResult = await paystackResponse.json();

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

    const result = await confirmFoodPayment(
      reference,
      paystackResult.data
    );

    return res.status(result.statusCode).send({
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
    console.error("VERIFY FOOD PAYMENT ERROR:", error);

    return res.status(500).send({
      message: "Cannot verify food payment at this time"
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