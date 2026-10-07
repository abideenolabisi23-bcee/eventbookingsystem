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
const ApartmentTicketModel =
  require("../models/apartmentTicket.model");

const {
  getApartmentAvailability
} = require("../utils/apartmentAvailability");


const startEventRefund = async (
  payment,
  booking,
  reason
) => {
  try {
    console.log(
      `Starting event refund: ${reason}`
    );

    // Don't start another refund
    if (
      payment.refundStatus === "pending" ||
      payment.refundStatus === "refunded"
    ) {
      return;
    }

    // The customer paid, but the booking
    // could not be completed.
    booking.bookingStatus = "cancelled";

    await booking.save();

    const refundResponse = await fetch(
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
            payment.paymentReference,

          // Full refund
          amount:
            payment.amount * 100
        })
      }
    );

    const refundData =
      await refundResponse.json();

    if (
      !refundResponse.ok ||
      !refundData.status
    ) {
      payment.status = "paid";
      payment.refundStatus = "failed";

      await payment.save();

      console.log(
        "Automatic event refund failed:",
        refundData.message
      );

      return;
    }

    // Create refund record
    await RefundModel.create({
      payment: payment._id,
      booking: booking._id,
      user: booking.user,

      // No tickets were created because
      // availability failed.
      tickets: [],

      amount: payment.amount,

      paystackRefundId:
        String(refundData.data.id),

      status: "pending"
    });

    payment.status = "paid";
    payment.refundStatus = "pending";

    await payment.save();

    console.log(
      `Event refund started for ${payment.paymentReference}`
    );

  } catch (error) {
    console.log(
      "EVENT REFUND ERROR:",
      error
    );

    payment.status = "paid";
    payment.refundStatus = "failed";

    await payment.save();
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

const initializePayment = async (
  req,
  res
) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.id;

    const booking =
      await BookingModel.findById(
        bookingId
      );

    if (!booking) {
      return res.status(404).send({
        message: "Booking not found"
      });
    }

    if (
      booking.user.toString() !==
      userId
    ) {
      return res.status(403).send({
        message:
          "You cannot pay for this booking"
      });
    }

    if (
      booking.bookingStatus ===
      "cancelled"
    ) {
      return res.status(400).send({
        message:
          "Cannot pay for a cancelled booking"
      });
    }

    if (
      booking.paymentStatus === "paid"
    ) {
      return res.status(400).send({
        message:
          "This booking has already been paid"
      });
    }

    if (
      !booking.ticketType ||
      booking.ticketPrice === null ||
      booking.ticketPrice === undefined
    ) {
      return res.status(400).send({
        message:
          "This booking does not have a valid ticket category"
      });
    }

    const event =
      await EventModel.findById(
        booking.event
      );

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (
      event.isAvailable === false
    ) {
      return res.status(400).send({
        message:
          "This event is currently unavailable"
      });
    }

    const selectedTicketType =
      event.ticketTypes.find(
        (type) =>
          type.name ===
          booking.ticketType
      );

    if (!selectedTicketType) {
      return res.status(400).send({
        message:
          `${booking.ticketType} ticket category is no longer available`
      });
    }

    if (
      selectedTicketType.availableTickets <=
      0
    ) {
      return res.status(400).send({
        message:
          `${booking.ticketType} tickets are sold out`
      });
    }

    if (
      booking.quantity >
      selectedTicketType.availableTickets
    ) {
      return res.status(400).send({
        message:
          `Only ${selectedTicketType.availableTickets} ${booking.ticketType} ticket(s) are currently available`
      });
    }

    if (
      Number(booking.ticketPrice) !==
      Number(selectedTicketType.price)
    ) {
      return res.status(400).send({
        message:
          "The ticket price has changed. Please create a new booking."
      });
    }

    const amount =
      booking.ticketPrice *
      booking.quantity;

    if (
      Number(booking.totalAmount) !==
      Number(amount)
    ) {
      return res.status(400).send({
        message:
          "Booking amount does not match the selected ticket price"
      });
    }

    const user =
      await UserModel.findById(
        userId
      );

    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    const existingPayment =
      await PaymentModel.findOne({
        booking: booking._id,

        status: {
          $in: [
            "pending",
            "processing",
            "paid"
          ]
        }
      });

    if (existingPayment) {
      if (
        existingPayment.status ===
        "paid"
      ) {
        return res.status(400).send({
          message:
            "This booking has already been paid"
        });
      }

      return res.status(400).send({
        message:
          "A payment has already been initialized for this booking",

        data: {
          paymentReference:
            existingPayment
              .paymentReference
        }
      });
    }

    const paymentReference =
      "PAY-" +
      Date.now() +
      "-" +
      Math.floor(
        Math.random() * 100000
      );

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
  email: user.email,

  amount:
    amount * 100,

  reference:
    paymentReference,

  callback_url:
    "http://localhost:5173/event-payment/callback"
})
        }
      );

    const paystackData =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData.status
    ) {
      return res.status(400).send({
        message:
          "Paystack payment initialization failed",

        error:
          paystackData.message
      });
    }

    const payment =
      await PaymentModel.create({
        user: userId,
        booking: booking._id,
        amount,
        paymentReference,
        status: "pending"
      });

    return res.status(201).send({
      message:
        "Payment initialized successfully",

      data: {
        payment,

        authorizationUrl:
          paystackData.data
            .authorization_url,

        accessCode:
          paystackData.data
            .access_code
      }
    });
  } catch (error) {
    console.log(
      "INITIALIZE PAYMENT ERROR:",
      error
    );

    return res.status(400).send({
      message:
        "Cannot initialize payment at this time",

      error: error.message
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.user.id;

    // ==========================================
    // FIND PAYMENT
    // ==========================================

    const payment = await PaymentModel.findOne({
      paymentReference: reference,
      user: userId
    });

    if (!payment) {
      return res.status(404).send({
        message: "Payment not found"
      });
    }

    // ==========================================
    // FIND BOOKING
    // ==========================================

    const booking = await BookingModel.findById(
      payment.booking
    );

    if (!booking) {
      return res.status(404).send({
        message: "Booking not found"
      });
    }

    // ==========================================
    // PAYMENT ALREADY COMPLETED
    // ==========================================

    if (
      payment.status === "paid" &&
      booking.paymentStatus === "paid" &&
      booking.bookingStatus === "confirmed"
    ) {
      const tickets = await TicketModel.find({
        booking: booking._id
      });

      return res.status(200).send({
        message: "Payment already verified",

        data: {
          payment,
          booking,
          tickets
        }
      });
    }

    // ==========================================
    // REFUNDED PAYMENT
    // ==========================================

    if (
      ["partially_refunded", "refunded"].includes(
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

    // ==========================================
    // PROCESSING
    // ==========================================

    if (payment.status === "processing") {
      return res.status(202).send({
        message:
          "Payment confirmation is currently being processed"
      });
    }

    // ==========================================
    // VERIFY WITH PAYSTACK
    // ==========================================

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const paystackData =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData.status
    ) {
      return res.status(400).send({
        message: "Payment verification failed"
      });
    }

    // ==========================================
    // CHECK PAYSTACK STATUS
    // ==========================================

    if (
      paystackData.data.status !== "success"
    ) {
      return res.status(400).send({
        message: "Payment was not successful"
      });
    }

    // ==========================================
    // CHECK AMOUNT
    // ==========================================

    if (
      paystackData.data.amount !==
      payment.amount * 100
    ) {
      return res.status(400).send({
        message:
          "Payment amount does not match"
      });
    }

    // ==========================================
    // CONFIRM EVENT PAYMENT
    // ==========================================

    const result =
      await confirmEventPayment(
        payment,
        paystackData.data.channel
      );

    // ==========================================
    // SUCCESS
    // ==========================================

    if (result.success) {
      return res.status(200).send({
        message:
          result.alreadyConfirmed
            ? "Payment already verified"
            : "Payment verified successfully",

        data: {
          payment: result.payment,
          booking: result.booking,
          tickets: result.tickets,

          availableTickets:
            result.availableTickets
      }
      });
    }

    // ==========================================
    // REFUND STARTED
    // ==========================================

    if (result.refundStarted) {
      return res.status(409).send({
        message: result.message,

        refundStarted: true
      });
    }

    // ==========================================
    // ANOTHER REQUEST IS PROCESSING
    // ==========================================

    if (result.processing) {
      return res.status(202).send({
        message: result.message
      });
    }

    return res.status(400).send({
      message:
        result.message ||
        "Cannot confirm payment"
    });

  } catch (error) {
    console.log(
      "VERIFY PAYMENT ERROR:",
      error
    );

    return res.status(400).send({
      message:
        "Cannot verify payment at this time",

      error: error.message
    });
  }
};

const verifyRefund = async (req, res) => {
  try {
    const { refundId } = req.params;
    const userId = req.user.id;

    const refund =
      await RefundModel.findById(refundId);

    if (!refund) {
      return res.status(404).send({
        message: "Refund not found"
      });
    }

    if (
      refund.user.toString() !== userId
    ) {
      return res.status(403).send({
        message:
          "You cannot verify this refund"
      });
    }

    const payment =
      await PaymentModel.findById(
        refund.payment
      );

    if (!payment) {
      return res.status(404).send({
        message: "Payment not found"
      });
    }

    const booking =
      await BookingModel.findById(
        refund.booking
      );

    if (!booking) {
      return res.status(404).send({
        message: "Booking not found"
      });
    }

    const paystackResponse =
      await fetch(
        `https://api.paystack.co/refund/${refund.paystackRefundId}`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

    const refundData =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !refundData.status
    ) {
      return res.status(400).send({
        message:
          "Could not verify refund",

        error:
          refundData.message
      });
    }

    const paystackRefundStatus =
      refundData.data.status;

    if (
      paystackRefundStatus ===
        "pending" ||
      paystackRefundStatus ===
        "processing"
    ) {
      refund.status =
        paystackRefundStatus;

      await refund.save();

      return res.status(200).send({
        message:
          "Refund is still being processed",

        data: {
          refundId: refund._id,
          refundStatus:
            refund.status
        }
      });
    }

    if (
      paystackRefundStatus ===
      "needs-attention"
    ) {
      refund.status =
        "needs-attention";

      await refund.save();

      return res.status(200).send({
        message:
          "Refund needs additional customer details",

        data: {
          refundId: refund._id,
          refundStatus:
            refund.status
        }
      });
    }

    if (
      paystackRefundStatus ===
      "failed"
    ) {
      refund.status = "failed";

      await refund.save();

      await TicketModel.updateMany(
        {
          _id: {
            $in: refund.tickets
          },

          status:
            "refund_pending"
        },
        {
          $set: {
            status: "valid"
          }
        }
      );

      return res.status(400).send({
        message:
          "Refund failed. Tickets have been restored.",

        data: {
          refundId: refund._id,
          refundStatus:
            refund.status
        }
      });
    }

    if (
      paystackRefundStatus ===
      "processed"
    ) {
      if (
        refund.status ===
        "processed"
      ) {
        return res.status(200).send({
          message:
            "Refund has already been processed",

          data: {
            refundId: refund._id,

            refundAmount:
              refund.amount,

            refundStatus:
              refund.status
          }
        });
      }

      const pendingTickets =
        await TicketModel.find({
          _id: {
            $in: refund.tickets
          },

          status:
            "refund_pending"
        });

      if (
        pendingTickets.length === 0
      ) {
        return res.status(400).send({
          message:
            "No refundable tickets were found"
        });
      }

      const ticketsByType = {};

      for (
        const ticket of pendingTickets
      ) {
        const ticketType =
          ticket.ticketType ||
          booking.ticketType;

        if (!ticketType) {
          return res.status(400).send({
            message:
              "Ticket category could not be determined"
          });
        }

        ticketsByType[ticketType] =
          (ticketsByType[
            ticketType
          ] || 0) + 1;
      }

      await TicketModel.updateMany(
        {
          _id: {
            $in: refund.tickets
          },

          status:
            "refund_pending"
        },
        {
          $set: {
            status: "cancelled",
            qrCode: null
          }
        }
      );

      for (
        const [
          ticketType,
          quantity
        ] of Object.entries(
          ticketsByType
        )
      ) {
        await EventModel.findOneAndUpdate(
          {
            _id: booking.event,

            "ticketTypes.name":
              ticketType
          },
          {
            $inc: {
              "ticketTypes.$.availableTickets":
                quantity
            }
          }
        );
      }

      payment.refundedAmount =
        (payment.refundedAmount ||
          0) + refund.amount;

      refund.status =
        "processed";

      if (
        payment.refundedAmount >=
        payment.amount
      ) {
        payment.status =
          "refunded";

        payment.refundStatus =
          "refunded";

        booking.paymentStatus =
          "refunded";
      } else {
        payment.status =
          "partially_refunded";

        payment.refundStatus =
          "partially_refunded";

        booking.paymentStatus =
          "partially_refunded";
      }

      const cancelledTickets =
        await TicketModel.countDocuments(
          {
            booking: booking._id,

            status:
              "cancelled"
          }
        );

      const nonCancelledTickets =
        await TicketModel.countDocuments(
          {
            booking: booking._id,

            status: {
              $in: [
                "valid",
                "used",
                "refund_pending"
              ]
            }
          }
        );

      if (
        nonCancelledTickets === 0
      ) {
        booking.bookingStatus =
          "cancelled";
      } else if (
        cancelledTickets > 0
      ) {
        booking.bookingStatus =
          "partially_cancelled";
      } else {
        booking.bookingStatus =
          "confirmed";
      }

      await refund.save();
      await payment.save();
      await booking.save();

      return res.status(200).send({
        message:
          "Refund completed successfully",

        data: {
          refundId:
            refund._id,

          refundAmount:
            refund.amount,

          totalRefundedAmount:
            payment.refundedAmount,

          refundStatus:
            refund.status,

          paymentStatus:
            payment.status,

          bookingStatus:
            booking.bookingStatus
        }
      });
    }

    return res.status(200).send({
      message:
        "Refund status received",

      data: {
        refundStatus:
          paystackRefundStatus
      }
    });
  } catch (error) {
    console.log(
      "VERIFY REFUND ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot verify refund at this time",

      error: error.message
    });
  }
};

const getMyRefunds = async (req, res) => {
  const { id } = req.user;

  try {
    const refunds = await RefundModel.find({
      user: id
    })
      .populate("booking")
      .populate("tickets")
      .sort({ createdAt: -1 });

    return res.status(200).send({
      message: "Refunds fetched successfully",
      data: refunds
    });

  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Cannot fetch refunds at this time"
    });
  }
};

const getRefundById = async (req, res) => {
  const { id } = req.user;
  const { refundId } = req.params;

  try {
    const refund = await RefundModel.findOne({
      _id: refundId,
      user: id
    })
      .populate("booking")
      .populate("tickets");

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
    console.log(error);

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
    const paystackSignature =
      req.headers["x-paystack-signature"];

    // ==========================================
    // CONFIRM REQUEST CAME FROM PAYSTACK
    // ==========================================

    const hash = crypto
      .createHmac(
        "sha512",
        process.env.PAYSTACK_SECRET_KEY
      )
      .update(req.rawBody)
      .digest("hex");

    if (hash !== paystackSignature) {
      return res.status(401).send({
        message: "Invalid Paystack signature"
      });
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

    // Paystack uses this for refund events
    const refundId =
      event.data?.id !== undefined
        ? String(event.data.id)
        : null;

    // Food refund events give us the original
    // transaction reference here.
    const transactionReference =
      event.data?.transaction_reference ||
      event.data?.transaction?.reference ||
      null;

    switch (event.event) {

      // ==========================================
      // 1. PAYMENT SUCCESSFUL
      // ==========================================

      case "charge.success": {
        console.log("Payment successful");

        const reference =
          event.data.reference;

        // ========================================
        // FIRST CHECK EVENT PAYMENT
        // ========================================

        const payment =
          await PaymentModel.findOne({
            paymentReference: reference
          });

        // ========================================
        // IF NOT EVENT PAYMENT,
        // CHECK APARTMENT PAYMENT
        // ========================================

        if (!payment) {
          const apartmentPayment =
            await ApartmentPaymentModel.findOne({
              paymentReference: reference
            });

          if (!apartmentPayment) {
            /*
              Food payment is handled by the
              food-payment flow.

              Do not treat a FOOD reference as
              an event/apartment payment error.
            */

            if (
              reference &&
              reference.startsWith(
                "FOOD-PAY-"
              )
            ) {
              console.log(
                "Food payment webhook received"
              );

              break;
            }

            console.log(
              "Payment not found"
            );

            break;
          }

          // ========================================
          // APARTMENT ALREADY REFUNDED
          // ========================================

          if (
            apartmentPayment.status ===
              "refunded" ||
            apartmentPayment.refundStatus ===
              "refunded"
          ) {
            console.log(
              "Apartment payment already refunded"
            );

            break;
          }

          // ========================================
          // FIND APARTMENT BOOKING
          // ========================================

          const apartmentBooking =
            await ApartmentBookingModel.findById(
              apartmentPayment.booking
            );

          if (!apartmentBooking) {
            console.log(
              "Apartment booking not found"
            );

            break;
          }

          // ========================================
          // ALREADY CONFIRMED
          // ========================================

          if (
            apartmentPayment.status ===
              "paid" &&
            apartmentBooking.paymentStatus ===
              "paid" &&
            apartmentBooking.bookingStatus ===
              "confirmed"
          ) {
            console.log(
              "Apartment payment already confirmed"
            );

            break;
          }

          // ========================================
          // REFUND ALREADY RUNNING
          // ========================================

          if (
            apartmentPayment.refundStatus ===
            "pending"
          ) {
            console.log(
              "Apartment refund already pending"
            );

            break;
          }

          // Customer really paid
          apartmentPayment.status = "paid";

          apartmentPayment.paymentMethod =
            event.data.channel;

          await apartmentPayment.save();

          // ========================================
          // AUTOMATIC APARTMENT REFUND HELPER
          // ========================================

          const startApartmentRefund =
            async (reason) => {
              console.log(
                `Starting apartment refund: ${reason}`
              );

              apartmentBooking.bookingStatus =
                "cancelled";

              await apartmentBooking.save();

              if (
                apartmentPayment.refundStatus ===
                  "pending" ||
                apartmentPayment.refundStatus ===
                  "refunded"
              ) {
                console.log(
                  "Apartment refund already started"
                );

                return;
              }

              try {
                const refundResponse =
                  await fetch(
                    "https://api.paystack.co/refund",
                    {
                      method: "POST",

                      headers: {
                        Authorization:
                          `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

                        "Content-Type":
                          "application/json"
                      },

                      body: JSON.stringify({
                        transaction:
                          apartmentPayment
                            .paymentReference
                      })
                    }
                  );

                const refundData =
                  await refundResponse.json();

                if (
                  !refundResponse.ok ||
                  !refundData.status
                ) {
                  apartmentPayment.refundStatus =
                    "failed";

                  await apartmentPayment.save();

                  console.log(
                    "Automatic apartment refund request failed"
                  );

                  return;
                }

                apartmentPayment.refundStatus =
                  "pending";

                if (
                  refundData.data &&
                  refundData.data.id
                ) {
                  apartmentPayment.paystackRefundId =
                    String(
                      refundData.data.id
                    );
                }

                await apartmentPayment.save();

                console.log(
                  `Apartment refund started for ${apartmentPayment.paymentReference}`
                );

              } catch (refundError) {
                console.log(
                  "APARTMENT REFUND ERROR:",
                  refundError
                );

                apartmentPayment.refundStatus =
                  "failed";

                await apartmentPayment.save();
              }
            };

          // ========================================
          // CHECK APARTMENT PAYMENT AMOUNT
          // ========================================

          if (
            event.data.amount !==
            apartmentPayment.amount * 100
          ) {
            console.log(
              "Apartment payment amount does not match"
            );

            await startApartmentRefund(
              "Apartment payment amount does not match"
            );

            break;
          }

          // ========================================
          // BOOKING ALREADY CANCELLED
          // ========================================

          if (
            apartmentBooking.bookingStatus ===
            "cancelled"
          ) {
            await startApartmentRefund(
              "Payment received for cancelled apartment booking"
            );

            break;
          }

          // ========================================
          // FIND APARTMENT
          // ========================================

          const apartment =
            await ApartmentModel.findById(
              apartmentBooking.apartment
            );

          if (!apartment) {
            await startApartmentRefund(
              "Apartment no longer exists"
            );

            break;
          }

          if (!apartment.isAvailable) {
            await startApartmentRefund(
              "Apartment is currently unavailable"
            );

            break;
          }

          // ========================================
          // FINAL APARTMENT AVAILABILITY CHECK
          // ========================================

          const { availableUnits } =
            await getApartmentAvailability({
              apartmentId:
                apartment._id,

              totalUnits:
                apartment.totalUnits,

              stayType:
                apartmentBooking.stayType,

              checkInDate:
                apartmentBooking.checkInDate,

              checkOutDate:
                apartmentBooking.checkOutDate,

              expectedCheckInTime:
                apartmentBooking
                  .expectedCheckInTime,

              excludeBookingId:
                apartmentBooking._id
            });

          console.log(
            "Apartment available units:",
            availableUnits
          );

          if (
            apartmentBooking.numberOfUnits >
            availableUnits
          ) {
            await startApartmentRefund(
              `Only ${availableUnits} apartment unit(s) are available`
            );

            break;
          }

          // Rooms are still available
          apartmentPayment.status = "paid";

          apartmentPayment.paymentMethod =
            event.data.channel;

          await apartmentPayment.save();

          apartmentBooking.paymentStatus =
            "paid";

          apartmentBooking.bookingStatus =
            "confirmed";

          await apartmentBooking.save();

          console.log(
            `Apartment payment ${apartmentPayment.paymentReference} confirmed successfully`
          );

          break;
        }

        // ========================================
        // EVENT TICKET PAYMENT
        // ========================================

        if (
          payment.status === "refunded" ||
          payment.status ===
            "partially_refunded"
        ) {
          console.log(
            "Event payment has already been refunded or partially refunded"
          );

          break;
        }

        // ========================================
        // FIND EVENT BOOKING
        // ========================================

        const eventBooking =
          await BookingModel.findById(
            payment.booking
          );

        if (!eventBooking) {
          console.log(
            "Event booking not found"
          );

          break;
        }

        // ========================================
        // ALREADY CONFIRMED
        // ========================================

        if (
          payment.status === "paid" &&
          eventBooking.paymentStatus ===
            "paid" &&
          eventBooking.bookingStatus ===
            "confirmed"
        ) {
          console.log(
            "Event payment already confirmed"
          );

          break;
        }

        // ========================================
        // CHECK PAYSTACK AMOUNT
        // ========================================

        if (
          event.data.amount !==
          payment.amount * 100
        ) {
          console.log(
            "Event payment amount does not match"
          );

          break;
        }

        // ========================================
        // CONFIRM EVENT PAYMENT
        // ========================================

        const eventPaymentResult =
          await confirmEventPayment(
            payment,
            event.data.channel
          );

        if (eventPaymentResult.success) {
          console.log(
            eventPaymentResult.alreadyConfirmed
              ? "Event payment was already confirmed"
              : `Event payment ${payment.paymentReference} confirmed successfully`
          );

          break;
        }

        if (
          eventPaymentResult.refundStarted
        ) {
          console.log(
            eventPaymentResult.message
          );

          break;
        }

        if (
          eventPaymentResult.processing
        ) {
          console.log(
            "Event payment confirmation is already being processed"
          );

          break;
        }

        console.log(
          "Event payment could not be confirmed:",
          eventPaymentResult.message
        );

        break;
      }

            // ==========================================
      // 2. REFUND PENDING
      // ==========================================
          if (
            apartmentPayment.status ===
              "paid" &&
            apartmentBooking.paymentStatus ===
              "paid" &&
            apartmentBooking.bookingStatus ===
              "confirmed"
          ) {
            const apartmentTicket =
              await createApartmentTicket(
                apartmentBooking
              );

            console.log(
              "Apartment payment already confirmed"
            );

            console.log(
              `Apartment ticket ${apartmentTicket.ticketCode} is available`
            );

            break;
          }
     

      // ==========================================
      // 4. REFUND PROCESSED
      // ==========================================

      case "refund.processed": {
        console.log("Refund processed");

        // ========================================
        // EVENT REFUND
        // ========================================

        const refund =
          await RefundModel.findOne({
            paystackRefundId: refundId
          });

        if (!refund) {

          // ======================================
          // APARTMENT REFUND
          // ======================================

          const apartmentPayment =
            await ApartmentPaymentModel.findOne({
              paystackRefundId: refundId
            });

          if (apartmentPayment) {
            if (
              apartmentPayment.refundStatus ===
              "refunded"
            ) {
              console.log(
                "Apartment refund was already completed"
              );

              break;
            }

            apartmentPayment.status =
              "refunded";

            apartmentPayment.refundStatus =
              "refunded";

            apartmentPayment.refundedAmount =
              apartmentPayment.amount;

            await apartmentPayment.save();

            const apartmentBooking =
              await ApartmentBookingModel.findById(
                apartmentPayment.booking
              );

            if (apartmentBooking) {
              apartmentBooking.paymentStatus =
                "refunded";

              apartmentBooking.bookingStatus =
                "cancelled";

              await apartmentBooking.save();
            }

            console.log(
              `Apartment refund completed successfully for ${apartmentPayment.paymentReference}`
            );

            break;
          }

          // ======================================
          // FOOD REFUND
          // ======================================

          const foodPayment =
            await FoodPaymentModel.findOne({
              reference:
                transactionReference
            });

          if (!foodPayment) {
            console.log(
              "Refund not found"
            );

            break;
          }

          if (
            foodPayment.status ===
            "refunded"
          ) {
            console.log(
              "Food refund was already completed"
            );

            break;
          }

          foodPayment.status =
            "refunded";

          foodPayment.refundAmount =
            event.data.amount
              ? event.data.amount / 100
              : foodPayment.amount;

          foodPayment.refundReference =
            event.data.refund_reference ||
            refundId;

          foodPayment.refundedAt =
            new Date();

          await foodPayment.save();

          const foodOrder =
            await FoodOrderModel.findById(
              foodPayment.order
            );

          if (foodOrder) {
            foodOrder.paymentStatus =
              "refunded";

            foodOrder.orderStatus =
              "cancelled";

            await foodOrder.save();
          }

          console.log(
            `Food refund completed successfully for ${foodPayment.reference}`
          );

          break;
        }

        // ========================================
        // EVENT REFUND PROCESSED
        // ========================================

        if (
          refund.status === "processed"
        ) {
          console.log(
            "Refund already processed"
          );

          break;
        }

        const payment =
          await PaymentModel.findById(
            refund.payment
          );

        if (!payment) {
          console.log(
            "Payment not found"
          );

          break;
        }

        const booking =
          await BookingModel.findById(
            refund.booking
          );

        if (!booking) {
          console.log(
            "Booking not found"
          );

          break;
        }

        const tickets =
          await TicketModel.find({
            _id: {
              $in: refund.tickets
            },

            status: "refund_pending"
          });

        // Cancel refunded tickets
        for (const ticket of tickets) {
          ticket.status = "cancelled";
          ticket.qrCode = null;

          await ticket.save();
        }

      if (tickets.length > 0) {
  const ticketsByType = {};

  for (const ticket of tickets) {
    const ticketType =
      ticket.ticketType ||
      booking.ticketType;

    if (!ticketType) {
      console.log(
        "Ticket category could not be determined"
      );

      continue;
    }

    ticketsByType[ticketType] =
      (ticketsByType[ticketType] ||
        0) + 1;
  }

  for (
    const [
      ticketType,
      quantity
    ] of Object.entries(
      ticketsByType
    )
  ) {
    await EventModel.findOneAndUpdate(
      {
        _id: booking.event,
        "ticketTypes.name":
          ticketType
      },
      {
        $inc: {
          "ticketTypes.$.availableTickets":
            quantity
        }
      }
    );
  }
}

        refund.status = "processed";

        await refund.save();

        payment.refundedAmount =
          (payment.refundedAmount || 0) +
          refund.amount;

        if (
          payment.refundedAmount >=
          payment.amount
        ) {
          payment.status =
            "refunded";

          payment.refundStatus =
            "refunded";

          booking.paymentStatus =
            "refunded";
        } else {
          payment.status =
            "partially_refunded";

          payment.refundStatus =
            "partially_refunded";

          booking.paymentStatus =
            "partially_refunded";
        }

        const cancelledTickets =
          await TicketModel.countDocuments({
            booking: booking._id,
            status: "cancelled"
          });

        const nonCancelledTickets =
          await TicketModel.countDocuments({
            booking: booking._id,

            status: {
              $in: ["valid", "used"]
            }
          });

        if (nonCancelledTickets === 0) {
          booking.bookingStatus =
            "cancelled";
        } else if (cancelledTickets > 0) {
          booking.bookingStatus =
            "partially_cancelled";
        } else {
          booking.bookingStatus =
            "confirmed";
        }

        await payment.save();
        await booking.save();

        console.log(
          `Refund ${refund._id} completed successfully`
        );

        break;
      }

            // ==========================================
      // 5. REFUND FAILED
      // ==========================================

      case "refund.failed": {
        console.log("Refund failed");

        const refund =
          await RefundModel.findOne({
            paystackRefundId: refundId
          });

        if (!refund) {

          // ======================================
          // APARTMENT REFUND
          // ======================================

          const apartmentPayment =
            await ApartmentPaymentModel.findOne({
              paystackRefundId: refundId
            });

          if (apartmentPayment) {
            if (
              apartmentPayment.refundStatus ===
              "refunded"
            ) {
              console.log(
                "Apartment refund already completed"
              );

              break;
            }

            apartmentPayment.status =
              "paid";

            apartmentPayment.refundStatus =
              "failed";

            await apartmentPayment.save();

            const apartmentBooking =
              await ApartmentBookingModel.findById(
                apartmentPayment.booking
              );

            if (apartmentBooking) {
              apartmentBooking.paymentStatus =
                "paid";

              apartmentBooking.bookingStatus =
                "cancelled";

              await apartmentBooking.save();
            }

            console.log(
              `Apartment refund failed for ${apartmentPayment.paymentReference}`
            );

            break;
          }

          // ======================================
          // FOOD REFUND
          // ======================================

          const foodPayment =
            await FoodPaymentModel.findOne({
              reference:
                transactionReference
            });

          if (!foodPayment) {
            console.log(
              "Refund not found"
            );

            break;
          }

          // Never reverse an already completed refund
          if (
            foodPayment.status ===
            "refunded"
          ) {
            console.log(
              "Food refund already completed"
            );

            break;
          }

          foodPayment.status = "paid";

          await foodPayment.save();

          const foodOrder =
            await FoodOrderModel.findById(
              foodPayment.order
            );

          if (foodOrder) {
            /*
              Keep the cancelled order cancelled.

              The payment returned to paid because
              the refund failed.
            */

            foodOrder.paymentStatus =
              "paid";

            await foodOrder.save();
          }

          console.log(
            `Food refund failed for ${foodPayment.reference}`
          );

          break;
        }

        // ========================================
        // EVENT REFUND FAILED
        // ========================================

        if (
          refund.status === "processed"
        ) {
          console.log(
            "Refund already processed, cannot mark as failed"
          );

          break;
        }

        if (
          refund.status === "failed"
        ) {
          console.log(
            "Refund already marked as failed"
          );

          break;
        }

        // Make tickets usable again
        await TicketModel.updateMany(
          {
            _id: {
              $in: refund.tickets
            },

            status: "refund_pending"
          },

          {
            $set: {
              status: "valid"
            }
          }
        );

        refund.status = "failed";

        await refund.save();

        const payment =
          await PaymentModel.findById(
            refund.payment
          );

        if (payment) {
          if (
            (payment.refundedAmount || 0) >
            0
          ) {
            payment.status =
              "partially_refunded";

            payment.refundStatus =
              "partially_refunded";
          } else {
            payment.status = "paid";

            payment.refundStatus =
              "failed";
          }

          await payment.save();
        }

        console.log(
          `Refund ${refund._id} failed. Tickets restored.`
        );

        break;
      }

      // ==========================================
      // 6. REFUND NEEDS ATTENTION
      // ==========================================

      case "refund.needs-attention": {
        console.log(
          "Refund needs attention"
        );

        const refund =
          await RefundModel.findOneAndUpdate(
            {
              paystackRefundId: refundId,

              status: {
                $nin: [
                  "processed",
                  "failed"
                ]
              }
            },

            {
              status: "needs-attention"
            },

            {
              returnDocument: "after"
            }
          );

        if (refund) {
          console.log(
            `Refund ${refund._id} needs attention`
          );

          break;
        }

        // ========================================
        // APARTMENT REFUND
        // ========================================

        const apartmentPayment =
          await ApartmentPaymentModel.findOne({
            paystackRefundId: refundId
          });

        if (apartmentPayment) {
          if (
            apartmentPayment.refundStatus ===
            "refunded"
          ) {
            console.log(
              "Apartment refund already completed"
            );

            break;
          }

          apartmentPayment.refundStatus =
            "pending";

          await apartmentPayment.save();

          console.log(
            `Apartment refund for ${apartmentPayment.paymentReference} needs attention`
          );

          break;
        }

        // ========================================
        // FOOD REFUND
        // ========================================

        const foodPayment =
          await FoodPaymentModel.findOne({
            reference:
              transactionReference
          });

        if (!foodPayment) {
          console.log(
            "Refund not found or already completed"
          );

          break;
        }

        if (
          foodPayment.status ===
          "refunded"
        ) {
          console.log(
            "Food refund already completed"
          );

          break;
        }

        // Keep waiting for final Paystack result
        foodPayment.status =
          "refund_pending";

        await foodPayment.save();

        console.log(
          `Food refund ${foodPayment.reference} needs attention`
        );

        break;
      }

      // ==========================================
      // OTHER PAYSTACK EVENTS
      // ==========================================

      default: {
        console.log(
          "Unhandled Paystack event:",
          event.event
        );

        break;
      }
    }

    return res.sendStatus(200);

  } catch (error) {
    console.log(
      "PAYSTACK WEBHOOK ERROR:",
      error
    );

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