const crypto = require("node:crypto");
const QRCode = require("qrcode");

const ApartmentBookingModel = require("../models/apartmentBooking.model");
const ApartmentPaymentModel = require("../models/apartmentPayment.model");
const ApartmentTicketModel = require("../models/apartmentTicket.model");
const ApartmentModel = require("../models/apartment.model");
const UserModel = require("../models/user.model");
const getPaymentCallbackUrl = require("../utils/paymentCallback");

const {
  getApartmentAvailability
} = require("../utils/apartmentAvailability");

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const HOLD_DURATION = 15 * 60 * 1000;

const getPaystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json"
});

const paystackRequest = async (path, options = {}) => {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getPaystackHeaders(),
      ...(options.headers || {})
    }
  });

  const result = await response.json();

  return {
    ok: response.ok && result.status === true,
    result
  };
};

const getPaymentReference = () => {
  return `APT-PAY-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
};

const getTicketCode = () => {
  return `APT-TKT-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
};

const isBookingExpired = (booking) => {
  return Boolean(
    booking.expiresAt &&
    new Date(booking.expiresAt).getTime() <= Date.now()
  );
};

const getPaymentCompletionTime = (transaction) => {
  const value = transaction.paid_at || transaction.paidAt;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const createApartmentTicket = async (booking) => {
  const existingTicket = await ApartmentTicketModel.findOne({
    booking: booking._id
  });

  if (existingTicket) {
    return existingTicket;
  }

  const ticketCode = getTicketCode();

  const qrCode = await QRCode.toDataURL(
    `APARTMENT:${ticketCode}`
  );

  try {
    return await ApartmentTicketModel.create({
      booking: booking._id,
      user: booking.user,
      apartment: booking.apartment,
      ticketCode,
      qrCode,
      status: "valid"
    });
  } catch (error) {
    if (error.code === 11000) {
      const ticket = await ApartmentTicketModel.findOne({
        booking: booking._id
      });

      if (ticket) {
        return ticket;
      }
    }

    throw error;
  }
};

const getAvailableUnitsForBooking = async (
  booking,
  apartment
) => {
  return getApartmentAvailability({
    apartmentId: apartment._id,
    totalUnits: apartment.totalUnits,
    stayType: booking.stayType,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    expectedCheckInTime: booking.expectedCheckInTime,
    excludeBookingId: booking._id
  });
};

const initiateApartmentRefund = async ({
  booking,
  payment,
  reason
}) => {
  if (
    payment.refundStatus === "pending" ||
    payment.refundStatus === "refunded"
  ) {
    return {
      started: true,
      alreadyStarted: true,
      refundStatus: payment.refundStatus
    };
  }

  booking.bookingStatus = "cancelled";

  await booking.save();

  try {
    const { ok, result } = await paystackRequest(
      "/refund",
      {
        method: "POST",
        body: JSON.stringify({
          transaction: payment.paymentReference
        })
      }
    );

    if (!ok) {
      payment.refundStatus = "failed";

      await payment.save();

      console.error("APARTMENT REFUND REJECTED:", {
        reason,
        reference: payment.paymentReference,
        message: result.message
      });

      return {
        started: false,
        refundStatus: "failed"
      };
    }

    payment.refundStatus = "pending";

    if (result.data?.id) {
      payment.paystackRefundId = String(result.data.id);
    }

    await payment.save();

    return {
      started: true,
      refundStatus: "pending"
    };
  } catch (error) {
    console.error("APARTMENT REFUND ERROR:", error);

    payment.refundStatus = "failed";

    await payment.save();

    return {
      started: false,
      refundStatus: "failed"
    };
  }
};

const initializeApartmentPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.id;

    if (!bookingId) {
      return res.status(400).send({
        message: "Apartment booking ID is required"
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).send({
        message: "Apartment payment service is not configured"
      });
    }

    const booking = await ApartmentBookingModel.findOne({
      _id: bookingId,
      user: userId
    });

    if (!booking) {
      return res.status(404).send({
        message: "Apartment booking not found"
      });
    }

    if (booking.bookingStatus === "cancelled") {
      return res.status(400).send({
        message: "Cannot pay for a cancelled apartment booking"
      });
    }

    if (booking.paymentStatus === "paid") {
      return res.status(400).send({
        message: "This apartment booking has already been paid"
      });
    }

    if (booking.paymentStatus === "refunded") {
      return res.status(400).send({
        message: "This apartment booking has already been refunded"
      });
    }

    if (
      !["pending", "expired"].includes(booking.bookingStatus)
    ) {
      return res.status(400).send({
        message: "This apartment booking cannot accept payment"
      });
    }

    const apartment = await ApartmentModel.findById(
      booking.apartment
    );

    if (!apartment) {
      return res.status(404).send({
        message: "Apartment not found"
      });
    }

    if (!apartment.isAvailable) {
      return res.status(400).send({
        message: "This apartment is currently unavailable"
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    const amount = Number(booking.totalAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).send({
        message: "Invalid apartment booking amount"
      });
    }

    const existingPendingPayment =
      await ApartmentPaymentModel.findOne({
        booking: booking._id,
        user: userId,
        status: "pending"
      }).sort({
        createdAt: -1
      });

    if (existingPendingPayment?.paymentReference) {
      const { ok, result } = await paystackRequest(
        `/transaction/verify/${encodeURIComponent(
          existingPendingPayment.paymentReference
        )}`,
        {
          method: "GET"
        }
      );

      if (!ok) {
        return res.status(503).send({
          message:
            "Unable to check the previous payment. Please try again before starting another payment."
        });
      }

      if (result.data?.status === "success") {
        return res.status(409).send({
          message:
            "A successful payment already exists for this booking. Verify that payment before trying again.",
          reference: existingPendingPayment.paymentReference
        });
      }

      if (
        result.data?.status === "pending" ||
        result.data?.status === "ongoing"
      ) {
        if (
          booking.bookingStatus === "pending" &&
          !isBookingExpired(booking) &&
          existingPendingPayment.authorizationUrl
        ) {
          return res.status(200).send({
            message:
              "Existing apartment payment session fetched successfully",
            data: {
              payment: existingPendingPayment,
              authorizationUrl:
                existingPendingPayment.authorizationUrl,
              accessCode: existingPendingPayment.accessCode,
              reservationExpiresAt: booking.expiresAt
            }
          });
        }
      }
    }

    const holdExpired =
      booking.bookingStatus === "expired" ||
      isBookingExpired(booking);

    if (holdExpired) {
      const { availableUnits } =
        await getAvailableUnitsForBooking(
          booking,
          apartment
        );

      if (booking.numberOfUnits > availableUnits) {
        return res.status(400).send({
          message:
            `Your reservation has expired and only ${availableUnits} room(s) are available.`,
          holdExpired: true,
          availableUnits
        });
      }

      booking.bookingStatus = "pending";
      booking.paymentStatus = "pending";
      booking.expiresAt = new Date(
        Date.now() + HOLD_DURATION
      );

      await booking.save();
    }

    const paymentReference = getPaymentReference();

    // const callbackUrl =
    //   process.env.APARTMENT_PAYMENT_CALLBACK_URL ||
    //   "https://eventbookingsystem-gkh7.vercel.app/apartment-payment/callback";

    const { ok, result } = await paystackRequest(
      "/transaction/initialize",
      {
        method: "POST",
        body: JSON.stringify({
          email: user.email,
          amount: Math.round(amount * 100),
          currency: "NGN",
          reference: paymentReference,
callback_url: getPaymentCallbackUrl(
  req,
  "/apartment-payment/callback"
)
        })
      }
    );

    if (!ok || !result.data?.authorization_url) {
      return res.status(400).send({
        message: "Apartment payment initialization failed",
        error:
          result.message || "Unable to initialize payment"
      });
    }

    const payment = await ApartmentPaymentModel.create({
      user: userId,
      booking: booking._id,
      amount,
      paymentReference,
      status: "pending",
      refundStatus: "none",
      authorizationUrl: result.data.authorization_url,
      accessCode: result.data.access_code
    });

    return res.status(201).send({
      message: holdExpired
        ? "Apartment availability confirmed and a new payment session created successfully"
        : "Apartment payment initialized successfully",
      data: {
        payment,
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
        reservationExpiresAt: booking.expiresAt
      }
    });
  } catch (error) {
    console.error(
      "INITIALIZE APARTMENT PAYMENT ERROR:",
      error
    );

    return res.status(500).send({
      message: "Cannot initialize apartment payment at this time"
    });
  }
};

const verifyApartmentPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.user.id;

    if (!reference) {
      return res.status(400).send({
        message: "Payment reference is required"
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).send({
        message: "Apartment payment service is not configured"
      });
    }

    const payment = await ApartmentPaymentModel.findOne({
      paymentReference: reference,
      user: userId
    });

    if (!payment) {
      return res.status(404).send({
        message: "Apartment payment not found"
      });
    }

    const booking = await ApartmentBookingModel.findOne({
      _id: payment.booking,
      user: userId
    });

    if (!booking) {
      return res.status(404).send({
        message: "Apartment booking not found"
      });
    }

    if (
      payment.status === "paid" &&
      booking.paymentStatus === "paid" &&
      booking.bookingStatus === "confirmed"
    ) {
      const ticket = await createApartmentTicket(booking);

      return res.status(200).send({
        message: "Apartment payment already verified",
        data: {
          payment,
          booking,
          ticket
        }
      });
    }

    if (
      payment.status === "refunded" ||
      payment.refundStatus === "refunded"
    ) {
      return res.status(400).send({
        message: "This apartment payment has already been refunded"
      });
    }

    if (payment.refundStatus === "pending") {
      return res.status(200).send({
        message:
          "This payment is awaiting a refund. The apartment booking is not confirmed.",
        data: {
          payment,
          booking
        }
      });
    }

    const { ok, result } = await paystackRequest(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET"
      }
    );

    if (!ok || !result.data) {
      return res.status(400).send({
        message: "Apartment payment verification failed"
      });
    }

    const transaction = result.data;

    if (transaction.status !== "success") {
      return res.status(400).send({
        message: "Apartment payment was not successful",
        paymentStatus: transaction.status
      });
    }

    if (transaction.reference !== payment.paymentReference) {
      return res.status(400).send({
        message: "Payment reference verification failed"
      });
    }

    if (transaction.currency !== "NGN") {
      return res.status(400).send({
        message: "Payment currency verification failed"
      });
    }

    const expectedAmount = Math.round(
      Number(payment.amount) * 100
    );

    const bookingAmount = Math.round(
      Number(booking.totalAmount) * 100
    );

    const amountPaid = Number(transaction.amount);

    payment.status = "paid";
    payment.paymentMethod = transaction.channel || null;

    await payment.save();

    if (
      amountPaid !== expectedAmount ||
      expectedAmount !== bookingAmount
    ) {
      const refundResult = await initiateApartmentRefund({
        booking,
        payment,
        reason: "Apartment payment amount mismatch"
      });

      return res.status(400).send({
        message: refundResult.started
          ? "Payment amount mismatch. The booking was cancelled and a refund was requested."
          : "Payment amount mismatch. The booking was cancelled but the refund requires attention.",
        refundStatus: refundResult.refundStatus
      });
    }

    if (
      booking.bookingStatus === "cancelled" ||
      booking.bookingStatus === "expired"
    ) {
      const refundResult = await initiateApartmentRefund({
        booking,
        payment,
        reason: "Payment for an inactive apartment booking"
      });

      return res.status(400).send({
        message: refundResult.started
          ? "This reservation is no longer active. A refund was requested."
          : "This reservation is no longer active. The refund requires attention.",
        refundStatus: refundResult.refundStatus
      });
    }

    const paymentCompletedAt =
      getPaymentCompletionTime(transaction);

    const reservationDeadline = booking.expiresAt
      ? new Date(booking.expiresAt)
      : null;

    const paidAfterDeadline =
      !paymentCompletedAt ||
      !reservationDeadline ||
      paymentCompletedAt > reservationDeadline;

    if (paidAfterDeadline) {
      const refundResult = await initiateApartmentRefund({
        booking,
        payment,
        reason:
          "Payment was completed after the apartment reservation deadline"
      });

      return res.status(400).send({
        message: refundResult.started
          ? "Payment was completed after the reservation deadline. A refund was requested."
          : "Payment was completed after the reservation deadline. The refund requires attention.",
        refundStatus: refundResult.refundStatus
      });
    }

    const apartment = await ApartmentModel.findById(
      booking.apartment
    );

    if (!apartment || !apartment.isAvailable) {
      const refundResult = await initiateApartmentRefund({
        booking,
        payment,
        reason: "Apartment is no longer available"
      });

      return res.status(400).send({
        message: refundResult.started
          ? "The apartment is unavailable. A refund was requested."
          : "The apartment is unavailable. The refund requires attention.",
        refundStatus: refundResult.refundStatus
      });
    }

    const { availableUnits } =
      await getAvailableUnitsForBooking(
        booking,
        apartment
      );

    if (booking.numberOfUnits > availableUnits) {
      const refundResult = await initiateApartmentRefund({
        booking,
        payment,
        reason:
          "Insufficient apartment units during payment verification"
      });

      return res.status(400).send({
        message: refundResult.started
          ? "The requested rooms are no longer available. A refund was requested."
          : "The requested rooms are no longer available. The refund requires attention.",
        availableUnits,
        refundStatus: refundResult.refundStatus
      });
    }

    booking.paymentStatus = "paid";
    booking.bookingStatus = "confirmed";

    await booking.save();

    const ticket = await createApartmentTicket(booking);

    return res.status(200).send({
      message: "Apartment payment verified successfully",
      data: {
        payment,
        booking,
        ticket
      }
    });
  } catch (error) {
    console.error(
      "VERIFY APARTMENT PAYMENT ERROR:",
      error
    );

    return res.status(500).send({
      message: "Cannot verify apartment payment at this time"
    });
  }
};

module.exports = {
  initializeApartmentPayment,
  verifyApartmentPayment
};