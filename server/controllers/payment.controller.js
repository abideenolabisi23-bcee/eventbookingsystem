const BookingModel = require("../models/booking.model");
const TicketModel = require("../models/ticket.model");
const PaymentModel = require("../models/payment.model");
const UserModel = require("../models/user.model");
const RefundModel = require("../models/refund.model");
const EventModel = require("../models/event.model");
const ApartmentModel =
  require("../models/apartment.model");
const ApartmentPaymentModel =
  require("../models/apartmentPayment.model");

const ApartmentBookingModel =
  require("../models/apartmentBooking.model");
  const FoodPaymentModel = require("../models/foodPayment.model");
const FoodOrderModel = require("../models/foodOrder.model");
const crypto = require("crypto");
const QRCode = require("qrcode");
const mongoose = require("mongoose");
const ApartmentTicketModel =
  require("../models/apartmentTicket.model");

const {
  getApartmentAvailability
} = require("../utils/apartmentAvailability");
const {
  completeEventRefund
} = require("../utils/eventRefund");
const {
  confirmEventPayment: confirmMultipleCategoryPayment,
  validateBookingSelections
} = require("../utils/eventPayment");


const startEventRefund = async (payment, booking, reason) => {
  if (!payment?._id || !booking?._id) {
    return {
      success: false,
      message: "Payment or booking is missing"
    };
  }

  let refund;
  let createdNewRefund = false;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const currentPayment = await PaymentModel.findById(
        payment._id
      ).session(session);

      const currentBooking = await BookingModel.findById(
        booking._id
      ).session(session);

      if (!currentPayment || !currentBooking) {
        throw new Error("Payment or booking not found");
      }

      if (
        String(currentPayment.booking) !==
          String(currentBooking._id) ||
        String(currentPayment.user) !==
          String(currentBooking.user)
      ) {
        throw new Error("Payment and booking do not match");
      }

      const existingRefund = await RefundModel.findOne({
        payment: currentPayment._id,
        refundKind: "automatic_full"
      }).session(session);

      if (existingRefund) {
        refund = existingRefund;
        return;
      }

      if (
        currentPayment.refundStatus !== "none" ||
        currentPayment.refundedAmount > 0 ||
        ["refunded", "partially_refunded"].includes(
          currentPayment.status
        )
      ) {
        throw new Error(
          "Payment already has refund activity"
        );
      }

      const existingTickets = await TicketModel.countDocuments({
        booking: currentBooking._id
      }).session(session);

      if (existingTickets > 0) {
        throw new Error(
          "Automatic full refund cannot be created for issued tickets"
        );
      }

      const amount = Number(currentPayment.amount);
      const amountInKobo = Math.round(amount * 100);

      if (
        !Number.isFinite(amount) ||
        !Number.isSafeInteger(amountInKobo) ||
        amountInKobo <= 0
      ) {
        throw new Error("Invalid refund amount");
      }

      const created = await RefundModel.create(
        [
          {
            payment: currentPayment._id,
            booking: currentBooking._id,
            user: currentBooking.user,
            tickets: [],
            amount,
            refundKind: "automatic_full",
            reason:
              reason ||
              "Event booking could not be confirmed",
            status: "initiating"
          }
        ],
        { session }
      );

      refund = created[0];
      createdNewRefund = true;

      currentPayment.status = "paid";
      currentPayment.refundStatus = "pending";

      await currentPayment.save({ session });
    });
  } catch (error) {
    console.error("PREPARE EVENT REFUND ERROR:", error);

    return {
      success: false,
      requiresAttention: true,
      message:
        "Refund preparation requires reconciliation. Do not retry automatically."
    };
  } finally {
    await session.endSession();
  }

  if (!refund) {
    return {
      success: false,
      requiresAttention: true,
      message: "Refund record was not found"
    };
  }

  if (!createdNewRefund) {
    return {
      success: true,
      alreadyStarted: true,
      refundId: refund._id,
      refundStatus: refund.status,
      message:
        "A refund record already exists for this payment"
    };
  }

  const claimedRefund = await RefundModel.findOneAndUpdate(
    {
      _id: refund._id,
      status: "initiating"
    },
    {
      $set: {
        status: "processing"
      }
    },
    { new: true }
  );

  if (!claimedRefund) {
    return {
      success: false,
      requiresAttention: true,
      refundId: refund._id,
      message:
        "Refund processing state changed. Reconciliation is required."
    };
  }

  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new Error("Paystack secret key is missing");
    }

    const amountInKobo = Math.round(
      Number(claimedRefund.amount) * 100
    );

    const response = await fetch(
      "https://api.paystack.co/refund",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transaction: payment.paymentReference,
          amount: amountInKobo
        })
      }
    );

    const result = await response.json();

    if (
      !response.ok ||
      !result.status ||
      !result.data?.id
    ) {
      await RefundModel.findOneAndUpdate(
        {
          _id: claimedRefund._id,
          status: "processing"
        },
        {
          $set: {
            status: "needs-attention"
          }
        }
      );

      return {
        success: false,
        requiresAttention: true,
        refundId: claimedRefund._id,
        message:
          "Paystack refund outcome is uncertain. Reconciliation is required."
      };
    }

    const updatedRefund = await RefundModel.findOneAndUpdate(
      {
        _id: claimedRefund._id,
        status: "processing"
      },
      {
        $set: {
          paystackRefundId: String(result.data.id),
          status: [
            "pending",
            "processing",
            "needs-attention"
          ].includes(result.data.status)
            ? result.data.status
            : "pending"
        }
      },
      { new: true }
    );

    if (!updatedRefund) {
      return {
        success: false,
        requiresAttention: true,
        refundId: claimedRefund._id,
        message:
          "Refund request may have succeeded, but saving its result requires reconciliation."
      };
    }

    return {
      success: true,
      refundId: updatedRefund._id,
      paystackRefundId: updatedRefund.paystackRefundId,
      refundStatus: updatedRefund.status,
      message: "Refund request submitted successfully"
    };
  } catch (error) {
    console.error("EVENT REFUND REQUEST ERROR:", error);

    await RefundModel.findOneAndUpdate(
      {
        _id: claimedRefund._id,
        status: "processing"
      },
      {
        $set: {
          status: "needs-attention"
        }
      }
    );

    return {
      success: false,
      requiresAttention: true,
      refundId: claimedRefund._id,
      message:
        "Refund request requires reconciliation. Do not submit another refund."
    };
  }
};

const confirmEventPayment = async (
  payment,
  paymentMethod
) => {
  const booking =
    await BookingModel.findById(
      payment.booking
    );

  if (!booking) {
    return {
      success: false,
      message: "Booking not found"
    };
  }

  if (
    payment.status === "paid" &&
    booking.paymentStatus === "paid" &&
    booking.bookingStatus === "confirmed"
  ) {
    const existingTickets =
      await TicketModel.find({
        booking: booking._id
      });

    return {
      success: true,
      alreadyConfirmed: true,
      booking,
      payment,
      tickets: existingTickets
    };
  }

  if (
    payment.status === "refunded" ||
    payment.status ===
      "partially_refunded"
  ) {
    return {
      success: false,
      message:
        "This payment has already been refunded"
    };
  }

  if (
    !booking.ticketType ||
    booking.ticketPrice === null ||
    booking.ticketPrice === undefined
  ) {
    return {
      success: false,
      message:
        "This booking does not have a valid ticket category"
    };
  }

  const lockedPayment =
    await PaymentModel.findOneAndUpdate(
      {
        _id: payment._id,
        status: "pending"
      },
      {
        $set: {
          status: "processing",
          paymentMethod:
            paymentMethod || null
        }
      },
      {
        new: true
      }
    );

  if (!lockedPayment) {
    const latestPayment =
      await PaymentModel.findById(
        payment._id
      );

    const latestBooking =
      await BookingModel.findById(
        payment.booking
      );

    if (
      latestPayment &&
      latestPayment.status === "paid" &&
      latestBooking &&
      latestBooking.paymentStatus ===
        "paid" &&
      latestBooking.bookingStatus ===
        "confirmed"
    ) {
      const existingTickets =
        await TicketModel.find({
          booking: latestBooking._id
        });

      return {
        success: true,
        alreadyConfirmed: true,
        payment: latestPayment,
        booking: latestBooking,
        tickets: existingTickets
      };
    }

    return {
      success: false,
      processing: true,
      message:
        "Payment confirmation is already being processed"
    };
  }

  const event =
    await EventModel.findById(
      booking.event
    );

  if (!event) {
    lockedPayment.status = "paid";

    await lockedPayment.save();

    await startEventRefund(
      lockedPayment,
      booking,
      "Event no longer exists"
    );

    return {
      success: false,
      refundStarted: true,
      message:
        "Event no longer exists. Refund has been started."
    };
  }

  if (event.isAvailable === false) {
    lockedPayment.status = "paid";

    await lockedPayment.save();

    await startEventRefund(
      lockedPayment,
      booking,
      "Event is currently unavailable"
    );

    return {
      success: false,
      refundStarted: true,
      message:
        "Event is unavailable. Refund has been started."
    };
  }

  const selectedTicketType =
    event.ticketTypes.find(
      (type) =>
        type.name === booking.ticketType
    );

  if (!selectedTicketType) {
    lockedPayment.status = "paid";

    await lockedPayment.save();

    await startEventRefund(
      lockedPayment,
      booking,
      `${booking.ticketType} ticket category is no longer available`
    );

    return {
      success: false,
      refundStarted: true,
      message:
        "The selected ticket category is no longer available. A refund has been started."
    };
  }

  const updatedEvent =
    await EventModel.findOneAndUpdate(
      {
        _id: booking.event,

        isAvailable: {
          $ne: false
        },

        ticketTypes: {
          $elemMatch: {
            name: booking.ticketType,

            availableTickets: {
              $gte: booking.quantity
            }
          }
        }
      },
      {
        $inc: {
          "ticketTypes.$.availableTickets":
            -booking.quantity
        }
      },
      {
        new: true
      }
    );

  if (!updatedEvent) {
    lockedPayment.status = "paid";

    await lockedPayment.save();

    await startEventRefund(
      lockedPayment,
      booking,
      `Not enough ${booking.ticketType} tickets available`
    );

    return {
      success: false,
      refundStarted: true,
      message:
        `The requested ${booking.ticketType} tickets are no longer available. A refund has been started.`
    };
  }

  try {
    const tickets = [];

    for (
      let i = 0;
      i < booking.quantity;
      i++
    ) {
      const ticketCode =
        "TKT-" +
        Date.now() +
        "-" +
        booking._id
          .toString()
          .slice(-6) +
        "-" +
        i +
        "-" +
        Math.floor(
          Math.random() * 100000
        );

      const qrData =
        `EVENT:${ticketCode}`;

      const qrCode =
        await QRCode.toDataURL(
          qrData
        );

      const ticket =
        await TicketModel.create({
          booking: booking._id,
          user: booking.user,
          event: booking.event,

          ticketType:
            booking.ticketType,

          ticketPrice:
            booking.ticketPrice,

          ticketCode,
          qrCode,
          status: "valid"
        });

      tickets.push(ticket);
    }

    lockedPayment.status = "paid";

    lockedPayment.paymentMethod =
      paymentMethod ||
      lockedPayment.paymentMethod;

    await lockedPayment.save();

    booking.paymentStatus = "paid";
    booking.bookingStatus =
      "confirmed";

    await booking.save();

    const updatedTicketType =
      updatedEvent.ticketTypes.find(
        (type) =>
          type.name ===
          booking.ticketType
      );

    return {
      success: true,
      booking,
      payment: lockedPayment,
      tickets,

      ticketType:
        booking.ticketType,

      availableTickets:
        updatedTicketType
          ?.availableTickets
    };
  } catch (error) {
    await EventModel.findOneAndUpdate(
      {
        _id: booking.event,
        "ticketTypes.name":
          booking.ticketType
      },
      {
        $inc: {
          "ticketTypes.$.availableTickets":
            booking.quantity
        }
      }
    );

    await TicketModel.deleteMany({
      booking: booking._id
    });

    lockedPayment.status = "pending";

    await lockedPayment.save();

    throw error;
  }
};

const initializePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.id;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).send({
        message: "Invalid booking ID"
      });
    }

    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      return res.status(404).send({
        message: "Booking not found"
      });
    }

    if (String(booking.user) !== String(userId)) {
      return res.status(403).send({
        message: "You cannot pay for this booking"
      });
    }

    if (
      booking.bookingStatus !== "pending" ||
      booking.paymentStatus !== "pending"
    ) {
      return res.status(400).send({
        message: "This booking is not awaiting payment"
      });
    }

    const event = await EventModel.findById(booking.event);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.isAvailable === false) {
      return res.status(400).send({
        message: "This event is currently unavailable"
      });
    }

    let selections;

    try {
      selections = validateBookingSelections(booking, event);
    } catch (error) {
      return res.status(400).send({
        message: error.message
      });
    }

    for (const selection of selections) {
      const category = event.ticketTypes.find(
        (type) =>
          type._id &&
          String(type._id) === String(selection.ticketTypeId)
      );

      if (!category) {
        return res.status(400).send({
          message: `${selection.ticketType} category is no longer available`
        });
      }

      if (
        Number(category.price) !==
        Number(selection.ticketPrice)
      ) {
        return res.status(400).send({
          message: `${category.name} ticket price has changed. Please create a new booking.`
        });
      }

      if (
        Number(category.availableTickets) <
        Number(selection.quantity)
      ) {
        return res.status(400).send({
          message: `Only ${category.availableTickets} ${category.name} tickets are available`
        });
      }
    }

    const amount = Number(booking.totalAmount);
    const amountInKobo = Math.round(amount * 100);

    if (
      !Number.isFinite(amount) ||
      !Number.isSafeInteger(amountInKobo) ||
      amountInKobo <= 0
    ) {
      return res.status(400).send({
        message: "Invalid payment amount"
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    if (!user.email) {
      return res.status(400).send({
        message: "User email is required for payment"
      });
    }

    const existingPayment = await PaymentModel.findOne({
      booking: booking._id,
      status: {
        $in: [
          "pending",
          "processing",
          "paid",
          "partially_refunded",
          "refunded"
        ]
      }
    });

    if (existingPayment) {
      return res.status(400).send({
        message:
          "A payment already exists for this booking",
        data: {
          paymentReference:
            existingPayment.paymentReference,
          paymentStatus:
            existingPayment.status
        }
      });
    }

    const paymentReference =
      "PAY-" +
      crypto.randomBytes(16).toString("hex").toUpperCase();

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountInKobo,
          reference: paymentReference,
          currency: "NGN",
          callback_url:
            "https://eventbookingsystem-gkh7.vercel.app/event-payment/callback"
        })
      }
    );

    const paystackData = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData.status ||
      !paystackData.data?.authorization_url
    ) {
      return res.status(400).send({
        message: "Paystack payment initialization failed",
        error: paystackData.message
      });
    }

    const payment = await PaymentModel.create({
      user: userId,
      booking: booking._id,
      amount,
      paymentReference,
      status: "pending"
    });

    return res.status(201).send({
      message: "Payment initialized successfully",
      data: {
        payment,
        authorizationUrl:
          paystackData.data.authorization_url,
        accessCode:
          paystackData.data.access_code
      }
    });
  } catch (error) {
    console.log("INITIALIZE PAYMENT ERROR:", error);

    return res.status(500).send({
      message: "Cannot initialize payment at this time"
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.user.id;

    const payment = await PaymentModel.findOne({
      paymentReference: reference,
      user: userId
    });

    if (!payment) {
      return res.status(404).send({
        message: "Payment not found"
      });
    }

    const booking = await BookingModel.findById(
      payment.booking
    );

    if (!booking) {
      return res.status(409).send({
        message:
          "Payment record exists but the booking is missing. Contact support.",
        requiresAttention: true
      });
    }

    if (
      payment.status === "paid" &&
      booking.paymentStatus === "paid" &&
      booking.bookingStatus === "confirmed"
    ) {
      const tickets = await TicketModel.find({
        booking: booking._id
      });

      if (tickets.length !== Number(booking.quantity)) {
        return res.status(409).send({
          message:
            "Payment is confirmed, but the ticket records require reconciliation.",
          requiresAttention: true,
          paymentReference: reference
        });
      }

      return res.status(200).send({
        message: "Payment already verified",
        data: {
          payment,
          booking,
          tickets
        }
      });
    }

    if (
      ["refunded", "partially_refunded"].includes(
        payment.status
      )
    ) {
      const tickets = await TicketModel.find({
        booking: booking._id
      });

      return res.status(200).send({
        message:
          "Payment has already been refunded or partially refunded",
        data: {
          payment,
          booking,
          tickets
        }
      });
    }

    if (
      payment.refundStatus !== "none" ||
      Number(payment.refundedAmount || 0) > 0
    ) {
      return res.status(202).send({
        message:
          "This payment has refund activity. Check your refund status before taking further action.",
        requiresAttention: true,
        paymentReference: reference
      });
    }

    if (payment.status === "processing") {
      return res.status(202).send({
        message:
          "Payment confirmation is currently being processed"
      });
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const paystackData = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData.status ||
      !paystackData.data
    ) {
      return res.status(502).send({
        message: "Unable to verify payment with Paystack"
      });
    }

    const transaction = paystackData.data;

    if (
      String(transaction.reference) !==
      String(payment.paymentReference)
    ) {
      return res.status(409).send({
        message: "Payment reference does not match"
      });
    }

    if (transaction.status !== "success") {
      return res.status(400).send({
        message: "Payment has not been successful",
        paymentStatus: transaction.status
      });
    }

    const expectedAmount = Math.round(
      Number(payment.amount) * 100
    );

    if (
      !Number.isSafeInteger(expectedAmount) ||
      expectedAmount <= 0 ||
      Number(transaction.amount) !== expectedAmount ||
      transaction.currency !== "NGN"
    ) {
      return res.status(409).send({
        message:
          "Payment was received, but the amount or currency does not match. Contact support.",
        paymentReceived: true,
        requiresAttention: true,
        paymentReference: reference
      });
    }

    if (
      Math.round(Number(booking.totalAmount) * 100) !==
      expectedAmount
    ) {
      return res.status(409).send({
        message:
          "Payment was received, but the booking amount does not match. Contact support.",
        paymentReceived: true,
        requiresAttention: true,
        paymentReference: reference
      });
    }

    let result;

    try {
      result = await confirmMultipleCategoryPayment(
        payment,
        transaction.channel
      );
    } catch (error) {
      console.error(
        "EVENT PAYMENT CONFIRMATION ERROR:",
        error
      );

      return res.status(409).send({
        message:
          "Payment was successful, but ticket confirmation requires reconciliation. Do not pay again.",
        paymentReceived: true,
        requiresAttention: true,
        paymentReference: reference
      });
    }

    if (result.success) {
      return res.status(200).send({
        message: result.alreadyConfirmed
          ? "Payment already verified"
          : "Payment verified successfully",
        data: {
          payment: result.payment,
          booking: result.booking,
          tickets: result.tickets,
          availableTickets: result.availableTickets
        }
      });
    }

    if (result.processing) {
      return res.status(202).send({
        message:
          result.message ||
          "Payment confirmation is being processed"
      });
    }

    return res.status(409).send({
      message:
        result.message ||
        "Payment was received, but ticket confirmation requires attention. Do not pay again.",
      paymentReceived: true,
      requiresAttention: true,
      paymentReference: reference
    });
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);

    return res.status(500).send({
      message:
        "Cannot complete payment verification right now. Check your payment status before trying again."
    });
  }
};

const verifyRefund = async (req, res) => {
  try {
    const { refundId } = req.params;
    const userId = req.user.id;

    if (!mongoose.isValidObjectId(refundId)) {
      return res.status(400).send({
        message: "Invalid refund ID"
      });
    }

    const refund = await RefundModel.findById(refundId);

    if (!refund) {
      return res.status(404).send({
        message: "Refund not found"
      });
    }

    if (String(refund.user) !== String(userId)) {
      return res.status(403).send({
        message: "You cannot verify this refund"
      });
    }

    if (refund.status === "processed") {
      return res.status(200).send({
        message: "Refund has already been processed",
        data: {
          refundId: refund._id,
          refundAmount: refund.amount,
          refundStatus: refund.status
        }
      });
    }

    const payment = await PaymentModel.findById(
      refund.payment
    );

    const booking = await BookingModel.findById(
      refund.booking
    );

    if (!payment || !booking) {
      return res.status(404).send({
        message: "Payment or booking not found"
      });
    }

    if (
      String(payment.booking) !== String(booking._id) ||
      String(refund.user) !== String(booking.user)
    ) {
      return res.status(409).send({
        message: "Refund records do not match. Manual review is required."
      });
    }

    if (!refund.paystackRefundId) {
      return res.status(202).send({
        message:
          "Refund request requires reconciliation. Do not submit another refund.",
        data: {
          refundId: refund._id,
          refundStatus: refund.status,
          requiresAttention: true
        }
      });
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/refund/${encodeURIComponent(refund.paystackRefundId)}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const refundData = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !refundData.status ||
      !refundData.data
    ) {
      return res.status(502).send({
        message: "Could not verify refund with Paystack"
      });
    }

    const paystackRefund = refundData.data;

    if (
      String(paystackRefund.id) !==
      String(refund.paystackRefundId)
    ) {
      return res.status(409).send({
        message: "Paystack refund ID mismatch"
      });
    }

    const expectedAmount = Math.round(
      Number(refund.amount) * 100
    );

    if (
      !Number.isSafeInteger(expectedAmount) ||
      expectedAmount <= 0 ||
      Number(paystackRefund.amount) !== expectedAmount
    ) {
      return res.status(409).send({
        message:
          "Refund amount mismatch. Manual reconciliation is required."
      });
    }

    const paystackStatus = paystackRefund.status;

    if (
      paystackStatus === "pending" ||
      paystackStatus === "processing" ||
      paystackStatus === "needs-attention"
    ) {
      if (
        refund.status !== "failed" &&
        refund.status !== "processed"
      ) {
        refund.status = paystackStatus;
        await refund.save();
      }

      return res.status(200).send({
        message:
          paystackStatus === "needs-attention"
            ? "Refund needs additional attention"
            : "Refund is still being processed",
        data: {
          refundId: refund._id,
          refundStatus: refund.status
        }
      });
    }

    if (paystackStatus === "failed") {
      return res.status(409).send({
        message:
          "Paystack reports that this refund failed. Payment and ticket records require reconciliation.",
        data: {
          refundId: refund._id,
          refundStatus: refund.status,
          paystackRefundStatus: paystackStatus
        }
      });
    }

    if (paystackStatus === "processed") {
      if (refund.status === "failed") {
        return res.status(409).send({
          message:
            "Paystack processed this refund, but the local record is marked failed. Manual reconciliation is required."
        });
      }

      const result = await completeEventRefund(
        refund._id
      );

      return res.status(200).send({
        message: result.alreadyProcessed
          ? "Refund has already been processed"
          : "Refund completed successfully",
        data: {
          refundId: result.refund._id,
          refundAmount: result.refund.amount,
          refundStatus: result.refund.status,
          paymentStatus: result.payment?.status,
          bookingStatus: result.booking?.bookingStatus
        }
      });
    }

    return res.status(200).send({
      message: "Refund status received",
      data: {
        refundId: refund._id,
        refundStatus: paystackStatus
      }
    });
  } catch (error) {
    console.log("VERIFY REFUND ERROR:", error);

    return res.status(500).send({
      message:
        "Cannot verify refund at this time. Please contact support if money has already been refunded."
    });
  }
};


const getMyRefunds = async (req, res) => {
  const { id } = req.user;

  try {
    const refunds = await RefundModel.find({
      user: id
    })
      .populate({
        path: "booking",
        populate: {
          path: "event",
          select: "title location date"
        }
      })
      .populate({
        path: "tickets",
        select: "ticketType ticketPrice ticketCode status"
      })
      .sort({ createdAt: -1 });

    return res.status(200).send({
      message: "Refunds fetched successfully",
      data: refunds
    });
  } catch (error) {
    console.error("GET MY REFUNDS ERROR:", error);

    return res.status(500).send({
      message: "Cannot fetch refunds at this time"
    });
  }
};

const getRefundById = async (req, res) => {
  const { id } = req.user;
  const { refundId } = req.params;

  try {
    if (!mongoose.isValidObjectId(refundId)) {
      return res.status(400).send({
        message: "Invalid refund ID"
      });
    }

    const refund = await RefundModel.findOne({
      _id: refundId,
      user: id
    })
      .populate({
        path: "booking",
        populate: {
          path: "event",
          select: "title location date"
        }
      })
      .populate({
        path: "tickets",
        select: "ticketType ticketPrice ticketCode status"
      });

    if (!refund) {
      return res.status(404).send({
        message: "Refund not found"
      });
    }

    return res.status(200).send({
      message: "Refund fetched successfully",
      data: refund
    });
  } catch (error) {
    console.error("GET REFUND ERROR:", error);

    return res.status(500).send({
      message: "Cannot fetch refund at this time"
    });
  }
};

const createApartmentTicket = async (
  apartmentBooking
) => {
  const existingTicket =
    await ApartmentTicketModel.findOne({
      booking: apartmentBooking._id
    });

  if (existingTicket) {
    return existingTicket;
  }

  const ticketCode =
    "APT-TKT-" +
    Date.now() +
    "-" +
    Math.floor(
      1000 + Math.random() * 9000
    );

  const qrData =
    `APARTMENT:${ticketCode}`;

  const qrCode =
    await QRCode.toDataURL(qrData);

  const apartmentTicket =
    await ApartmentTicketModel.create({
      booking: apartmentBooking._id,
      user: apartmentBooking.user,
      apartment: apartmentBooking.apartment,
      ticketCode,
      qrCode,
      status: "valid"
    });

  return apartmentTicket;
};




const paystackWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];

    if (!process.env.PAYSTACK_SECRET_KEY || !req.rawBody) {
      return res.sendStatus(500);
    }

    const expectedSignature = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(req.rawBody)
      .digest("hex");

    if (
      !signature ||
      !/^[a-f0-9]{128}$/i.test(signature) ||
      !crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      )
    ) {
      return res.status(401).send({
        message: "Invalid Paystack signature"
      });
    }

    const webhookEvent = req.body;
    const data = webhookEvent.data || {};

    const refundId =
      data.id !== undefined && data.id !== null
        ? String(data.id)
        : null;

    const transactionReference =
      data.transaction_reference ||
      data.transaction?.reference ||
      null;

    console.log("PAYSTACK WEBHOOK:", webhookEvent.event);

    switch (webhookEvent.event) {
      case "charge.success": {
        const reference = data.reference;

        if (!reference) {
          break;
        }

        const payment = await PaymentModel.findOne({
          paymentReference: reference
        });

        if (payment) {
          const booking = await BookingModel.findById(
            payment.booking
          );

          if (!booking) {
            console.error(
              "EVENT BOOKING NOT FOUND:",
              reference
            );
            break;
          }

          if (
            String(payment.user) !== String(booking.user)
          ) {
            console.error(
              "EVENT PAYMENT OWNER MISMATCH:",
              reference
            );
            break;
          }

          if (
            payment.status === "refunded" ||
            payment.status === "partially_refunded" ||
            payment.refundStatus !== "none" ||
            Number(payment.refundedAmount || 0) > 0
          ) {
            console.log(
              "Event payment has refund activity:",
              reference
            );
            break;
          }

          if (
            payment.status === "paid" &&
            booking.paymentStatus === "paid" &&
            booking.bookingStatus === "confirmed"
          ) {
            const ticketCount =
              await TicketModel.countDocuments({
                booking: booking._id
              });

            if (
              ticketCount !== Number(booking.quantity)
            ) {
              console.error(
                "EVENT TICKET COUNT MISMATCH:",
                reference
              );
            } else {
              console.log(
                "Event payment already confirmed:",
                reference
              );
            }

            break;
          }

          if (payment.status === "processing") {
            console.log(
              "Event payment confirmation in progress:",
              reference
            );
            break;
          }

          const expectedAmount = Math.round(
            Number(payment.amount) * 100
          );

          if (
            !Number.isSafeInteger(expectedAmount) ||
            expectedAmount <= 0 ||
            Number(data.amount) !== expectedAmount ||
            data.currency !== "NGN"
          ) {
            console.error(
              "EVENT PAYMENT AMOUNT OR CURRENCY MISMATCH:",
              reference
            );
            break;
          }

          if (
            Math.round(
              Number(booking.totalAmount) * 100
            ) !== expectedAmount
          ) {
            console.error(
              "EVENT BOOKING AMOUNT MISMATCH:",
              reference
            );
            break;
          }

          try {
            const result =
              await confirmMultipleCategoryPayment(
                payment,
                data.channel
              );

            if (result.success) {
              console.log(
                result.alreadyConfirmed
                  ? "Event payment already confirmed"
                  : "Event payment confirmed",
                reference
              );
            } else if (result.processing) {
              console.log(
                "Event payment confirmation in progress:",
                reference
              );
            } else {
              console.error(
                "EVENT PAYMENT REQUIRES RECONCILIATION:",
                reference,
                result.message
              );
            }
          } catch (error) {
            console.error(
              "EVENT PAYMENT CONFIRMATION ERROR:",
              reference,
              error
            );

            throw error;
          }

          break;
        }

        const apartmentPayment =
          await ApartmentPaymentModel.findOne({
            paymentReference: reference
          });

        if (apartmentPayment) {
          const apartmentBooking =
            await ApartmentBookingModel.findById(
              apartmentPayment.booking
            );

          if (!apartmentBooking) {
            console.log("Apartment booking not found");
            break;
          }

          if (
            apartmentPayment.status === "refunded" ||
            apartmentPayment.refundStatus === "refunded"
          ) {
            break;
          }

          if (
            apartmentPayment.status === "paid" &&
            apartmentBooking.paymentStatus === "paid" &&
            apartmentBooking.bookingStatus === "confirmed"
          ) {
            await createApartmentTicket(apartmentBooking);
            break;
          }

          if (apartmentPayment.refundStatus === "pending") {
            break;
          }

          apartmentPayment.status = "paid";
          apartmentPayment.paymentMethod = data.channel;

          await apartmentPayment.save();

          const startApartmentRefund = async (reason) => {
            if (
              apartmentPayment.refundStatus === "pending" ||
              apartmentPayment.refundStatus === "refunded"
            ) {
              return;
            }

            apartmentBooking.bookingStatus = "cancelled";
            await apartmentBooking.save();

            try {
              const response = await fetch(
                "https://api.paystack.co/refund",
                {
                  method: "POST",
                  headers: {
                    Authorization:
                      `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    transaction:
                      apartmentPayment.paymentReference
                  })
                }
              );

              const result = await response.json();

              if (!response.ok || !result.status) {
                throw new Error(
                  result.message ||
                  "Apartment refund request failed"
                );
              }

              apartmentPayment.refundStatus = "pending";

              if (result.data?.id !== undefined) {
                apartmentPayment.paystackRefundId =
                  String(result.data.id);
              }

              await apartmentPayment.save();

              console.log(
                "Apartment refund requested:",
                reason
              );
            } catch (error) {
              console.error(
                "APARTMENT REFUND ERROR:",
                error
              );

              apartmentPayment.refundStatus = "failed";
              await apartmentPayment.save();
            }
          };

          if (
            Number(data.amount) !==
            Math.round(
              Number(apartmentPayment.amount) * 100
            )
          ) {
            await startApartmentRefund(
              "Apartment payment amount mismatch"
            );
            break;
          }

          if (
            apartmentBooking.bookingStatus === "cancelled"
          ) {
            await startApartmentRefund(
              "Apartment booking was cancelled"
            );
            break;
          }

          const apartment = await ApartmentModel.findById(
            apartmentBooking.apartment
          );

          if (
            !apartment ||
            apartment.isAvailable === false
          ) {
            await startApartmentRefund(
              "Apartment is unavailable"
            );
            break;
          }

          const availability =
            await getApartmentAvailability({
              apartmentId: apartment._id,
              totalUnits: apartment.totalUnits,
              stayType: apartmentBooking.stayType,
              checkInDate: apartmentBooking.checkInDate,
              checkOutDate: apartmentBooking.checkOutDate,
              expectedCheckInTime:
                apartmentBooking.expectedCheckInTime,
              excludeBookingId: apartmentBooking._id
            });

          if (
            apartmentBooking.numberOfUnits >
            availability.availableUnits
          ) {
            await startApartmentRefund(
              "Not enough apartment units available"
            );
            break;
          }

          apartmentBooking.paymentStatus = "paid";
          apartmentBooking.bookingStatus = "confirmed";

          await apartmentBooking.save();

          await createApartmentTicket(apartmentBooking);

          console.log("Apartment payment confirmed");
          break;
        }

        if (reference.startsWith("FOOD-PAY-")) {
          console.log(
            "Food payment received by shared webhook"
          );
          break;
        }

        console.log(
          "Unknown payment reference:",
          reference
        );

        break;
      }

      case "refund.processed": {
        if (!refundId) {
          break;
        }

        const refund = await RefundModel.findOne({
          paystackRefundId: refundId
        });

        if (refund) {
          const result = await completeEventRefund(
            refund._id
          );

          console.log(
            result.alreadyProcessed
              ? "Event refund already processed"
              : "Event refund processed"
          );

          break;
        }

        const apartmentPayment =
          await ApartmentPaymentModel.findOne({
            paystackRefundId: refundId
          });

        if (apartmentPayment) {
          if (
            apartmentPayment.refundStatus === "refunded"
          ) {
            break;
          }

          apartmentPayment.status = "refunded";
          apartmentPayment.refundStatus = "refunded";
          apartmentPayment.refundedAmount =
            apartmentPayment.amount;

          await apartmentPayment.save();

          const apartmentBooking =
            await ApartmentBookingModel.findById(
              apartmentPayment.booking
            );

          if (apartmentBooking) {
            apartmentBooking.paymentStatus = "refunded";
            apartmentBooking.bookingStatus = "cancelled";

            await apartmentBooking.save();
          }

          console.log("Apartment refund processed");
          break;
        }

        const foodPayment =
          await FoodPaymentModel.findOne({
            reference: transactionReference
          });

        if (foodPayment) {
          if (foodPayment.status === "refunded") {
            break;
          }

          foodPayment.status = "refunded";

          foodPayment.refundAmount =
            data.amount !== undefined
              ? Number(data.amount) / 100
              : foodPayment.amount;

          foodPayment.refundReference =
            data.refund_reference || refundId;

          foodPayment.refundedAt = new Date();

          await foodPayment.save();

          const foodOrder = await FoodOrderModel.findById(
            foodPayment.order
          );

          if (foodOrder) {
            foodOrder.paymentStatus = "refunded";
            foodOrder.orderStatus = "cancelled";

            await foodOrder.save();
          }

          console.log("Food refund processed");
          break;
        }

        console.log("Refund record not found");
        break;
      }

      case "refund.failed": {
        if (!refundId) {
          break;
        }

        const refund = await RefundModel.findOne({
          paystackRefundId: refundId
        });

        if (refund) {
          if (
            refund.status === "processed" ||
            refund.status === "failed"
          ) {
            break;
          }

          const session = await mongoose.startSession();

          try {
            await session.withTransaction(async () => {
              const currentRefund =
                await RefundModel.findById(
                  refund._id
                ).session(session);

              if (
                !currentRefund ||
                currentRefund.status === "processed" ||
                currentRefund.status === "failed"
              ) {
                return;
              }

              await TicketModel.updateMany(
                {
                  _id: {
                    $in: currentRefund.tickets
                  },
                  booking: currentRefund.booking,
                  status: "refund_pending"
                },
                {
                  $set: {
                    status: "valid"
                  }
                },
                { session }
              );

              currentRefund.status = "failed";
              await currentRefund.save({ session });

              const currentPayment =
                await PaymentModel.findById(
                  currentRefund.payment
                ).session(session);

              if (currentPayment) {
                if (
                  Number(
                    currentPayment.refundedAmount || 0
                  ) > 0
                ) {
                  currentPayment.status =
                    "partially_refunded";

                  currentPayment.refundStatus =
                    "partially_refunded";
                } else {
                  currentPayment.status = "paid";
                  currentPayment.refundStatus = "failed";
                }

                await currentPayment.save({ session });
              }
            });
          } finally {
            await session.endSession();
          }

          console.log("Event refund failed");
          break;
        }

        const apartmentPayment =
          await ApartmentPaymentModel.findOne({
            paystackRefundId: refundId
          });

        if (apartmentPayment) {
          if (
            apartmentPayment.refundStatus === "refunded"
          ) {
            break;
          }

          apartmentPayment.status = "paid";
          apartmentPayment.refundStatus = "failed";

          await apartmentPayment.save();

          const apartmentBooking =
            await ApartmentBookingModel.findById(
              apartmentPayment.booking
            );

          if (apartmentBooking) {
            apartmentBooking.paymentStatus = "paid";
            apartmentBooking.bookingStatus = "cancelled";

            await apartmentBooking.save();
          }

          console.log("Apartment refund failed");
          break;
        }

        const foodPayment =
          await FoodPaymentModel.findOne({
            reference: transactionReference
          });

        if (foodPayment) {
          if (foodPayment.status === "refunded") {
            break;
          }

          foodPayment.status = "paid";
          await foodPayment.save();

          const foodOrder = await FoodOrderModel.findById(
            foodPayment.order
          );

          if (foodOrder) {
            foodOrder.paymentStatus = "paid";
            await foodOrder.save();
          }

          console.log("Food refund failed");
        }

        break;
      }

      case "refund.needs-attention": {
        if (!refundId) {
          break;
        }

        const refund =
          await RefundModel.findOneAndUpdate(
            {
              paystackRefundId: refundId,
              status: {
                $nin: ["processed", "failed"]
              }
            },
            {
              $set: {
                status: "needs-attention"
              }
            },
            {
              new: true
            }
          );

        if (refund) {
          console.log(
            "Event refund needs attention"
          );
          break;
        }

        const apartmentPayment =
          await ApartmentPaymentModel.findOne({
            paystackRefundId: refundId
          });

        if (apartmentPayment) {
          if (
            apartmentPayment.refundStatus !== "refunded"
          ) {
            apartmentPayment.refundStatus = "pending";
            await apartmentPayment.save();
          }

          break;
        }

        const foodPayment =
          await FoodPaymentModel.findOne({
            reference: transactionReference
          });

        if (
          foodPayment &&
          foodPayment.status !== "refunded"
        ) {
          foodPayment.status = "refund_pending";
          await foodPayment.save();
        }

        break;
      }

      default: {
        console.log(
          "Unhandled Paystack event:",
          webhookEvent.event
        );

        break;
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("PAYSTACK WEBHOOK ERROR:", error);
    return res.sendStatus(500);
  }
};




const getMyPayments = async (req, res) => {
  const { id } = req.user;

  try {
    const payments = await PaymentModel.find({
      user: id
    })
      .populate({
        path: "booking",
        populate: {
          path: "event",
          select: "title location date image"
        }
      })
      .sort({ createdAt: -1 });

    return res.status(200).send({
      message: "Payments fetched successfully",
      data: payments
    });

  } catch (error) {
    console.log("GET MY PAYMENTS ERROR:", error);

    return res.status(500).send({
      message: "Cannot fetch payments at this time"
    });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  verifyRefund,
  getMyRefunds,
  getRefundById,
  paystackWebhook,
  getMyPayments
};