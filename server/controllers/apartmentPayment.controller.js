const ApartmentBookingModel =
  require("../models/apartmentBooking.model");

const ApartmentPaymentModel =
  require("../models/apartmentPayment.model");

const UserModel =
  require("../models/user.model");

const ApartmentModel =
  require("../models/apartment.model");

const ApartmentTicketModel =
  require("../models/apartmentTicket.model");

const QRCode = require("qrcode");

const {
  getApartmentAvailability
} = require("../utils/apartmentAvailability");

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

  const qrCode =
    await QRCode.toDataURL(
      `APARTMENT:${ticketCode}`
    );

  try {
    const apartmentTicket =
      await ApartmentTicketModel.create({
        booking: apartmentBooking._id,
        user: apartmentBooking.user,
        apartment:
          apartmentBooking.apartment,
        ticketCode,
        qrCode,
        status: "valid"
      });

    return apartmentTicket;
  } catch (error) {
    if (error.code === 11000) {
      const existingTicket =
        await ApartmentTicketModel.findOne({
          booking:
            apartmentBooking._id
        });

      if (existingTicket) {
        return existingTicket;
      }
    }

    throw error;
  }
};

const initializeApartmentPayment = async (
  req,
  res
) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.id;

    if (!bookingId) {
      return res.status(400).send({
        message:
          "Apartment booking ID is required"
      });
    }

    const booking =
      await ApartmentBookingModel.findById(
        bookingId
      );

    if (!booking) {
      return res.status(404).send({
        message:
          "Apartment booking not found"
      });
    }

    if (
      booking.user.toString() !==
      userId.toString()
    ) {
      return res.status(403).send({
        message:
          "You cannot pay for this apartment booking"
      });
    }

    if (
      booking.bookingStatus ===
      "cancelled"
    ) {
      return res.status(400).send({
        message:
          "Cannot pay for a cancelled apartment booking"
      });
    }

    if (
      booking.paymentStatus === "paid"
    ) {
      return res.status(400).send({
        message:
          "This apartment booking has already been paid"
      });
    }

    if (
      booking.paymentStatus ===
      "refunded"
    ) {
      return res.status(400).send({
        message:
          "This apartment booking has already been refunded"
      });
    }

    const apartment =
      await ApartmentModel.findById(
        booking.apartment
      );

    if (!apartment) {
      return res.status(404).send({
        message:
          "Apartment not found"
      });
    }

    if (!apartment.isAvailable) {
      return res.status(400).send({
        message:
          "This apartment is currently unavailable"
      });
    }

    const now = new Date();

    const holdExpired =
      booking.bookingStatus ===
        "pending" &&
      booking.expiresAt &&
      now >= new Date(
        booking.expiresAt
      );

    if (holdExpired) {
      const {
        availableUnits
      } =
        await getApartmentAvailability({
          apartmentId:
            apartment._id,

          totalUnits:
            apartment.totalUnits,

          stayType:
            booking.stayType,

          checkInDate:
            booking.checkInDate,

          checkOutDate:
            booking.checkOutDate,

          expectedCheckInTime:
            booking.expectedCheckInTime,

          excludeBookingId:
            booking._id
        });

      if (
        booking.numberOfUnits >
        availableUnits
      ) {
        return res.status(400).send({
          message:
            `Your 15-minute reservation hold has expired and only ${availableUnits} room(s) are now available. Please choose another available option.`,

          holdExpired: true,

          availableUnits
        });
      }

      booking.bookingStatus =
        "pending";

      booking.expiresAt =
        new Date(
          Date.now() +
            15 * 60 * 1000
        );

      await booking.save();
    }

    const user =
      await UserModel.findById(
        userId
      );

    if (!user) {
      return res.status(404).send({
        message:
          "User not found"
      });
    }

    const amount =
      booking.totalAmount;

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).send({
        message:
          "Invalid apartment booking amount"
      });
    }

    const existingPendingPayment =
      await ApartmentPaymentModel
        .findOne({
          booking:
            booking._id,

          user:
            userId,

          status:
            "pending"
        })
        .sort({
          createdAt: -1
        });

    if (
      existingPendingPayment &&
      !holdExpired &&
      existingPendingPayment
        .authorizationUrl
    ) {
      return res.status(200).send({
        message:
          "Existing apartment payment session fetched successfully",

        data: {
          payment:
            existingPendingPayment,

          authorizationUrl:
            existingPendingPayment
              .authorizationUrl,

          accessCode:
            existingPendingPayment
              .accessCode,

          reservationExpiresAt:
            booking.expiresAt
        }
      });
    }

    const paymentReference =
      "APT-PAY-" +
      Date.now() +
      "-" +
      Math.floor(
        Math.random() * 1000
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
            email:
              user.email,

            amount:
              amount * 100,

            reference:
              paymentReference,

            callback_url:
              "https://eventbookingsystem-gkh7.vercel.app/apartment-payment/callback"
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
          "Apartment payment initialization failed",

        error:
          paystackData.message ||
          "Unable to initialize payment"
      });
    }

    const payment =
      await ApartmentPaymentModel.create({
        user:
          userId,

        booking:
          booking._id,

        amount,

        paymentReference,

        status:
          "pending",

        refundStatus:
          "none",

        authorizationUrl:
          paystackData.data
            .authorization_url,

        accessCode:
          paystackData.data
            .access_code
      });

    return res.status(201).send({
      message:
        holdExpired
          ? "Room availability confirmed again and a new 15-minute payment session was created successfully"
          : "Apartment payment initialized successfully",

      data: {
        payment,

        authorizationUrl:
          paystackData.data
            .authorization_url,

        accessCode:
          paystackData.data
            .access_code,

        reservationExpiresAt:
          booking.expiresAt
      }
    });
  } catch (error) {
    console.log(
      "INITIALIZE APARTMENT PAYMENT ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot initialize apartment payment at this time",

      error:
        error.message
    });
  }
};

const verifyApartmentPayment = async (
  req,
  res
) => {
  try {
    const { reference } = req.params;
    const userId = req.user.id;

    const payment =
      await ApartmentPaymentModel.findOne({
        paymentReference:
          reference,

        user:
          userId
      });

    if (!payment) {
      return res.status(404).send({
        message:
          "Apartment payment not found"
      });
    }

    const booking =
      await ApartmentBookingModel.findById(
        payment.booking
      );

    if (!booking) {
      return res.status(404).send({
        message:
          "Apartment booking not found"
      });
    }

    if (
      payment.status === "paid" &&
      booking.paymentStatus === "paid" &&
      booking.bookingStatus ===
        "confirmed"
    ) {
      const apartmentTicket =
        await createApartmentTicket(
          booking
        );

      return res.status(200).send({
        message:
          "Apartment payment already verified",

        data: {
          payment,
          booking,
          ticket:
            apartmentTicket
        }
      });
    }

    if (
      payment.status === "refunded" ||
      payment.refundStatus ===
        "refunded"
    ) {
      return res.status(400).send({
        message:
          "This apartment payment has already been refunded",

        data: {
          payment,
          booking
        }
      });
    }

    if (
      payment.refundStatus ===
      "pending"
    ) {
      return res.status(200).send({
        message:
          "This payment was received, but the apartment booking could not be confirmed. Refund is already being processed.",

        data: {
          payment,
          booking
        }
      });
    }

    const paystackResponse =
      await fetch(
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
        message:
          "Apartment payment verification failed"
      });
    }

    if (
      paystackData.data.status !==
      "success"
    ) {
      return res.status(400).send({
        message:
          "Apartment payment was not successful"
      });
    }

    const expectedAmount =
      payment.amount * 100;

    const amountPaid =
      paystackData.data.amount;

    payment.status = "paid";

    payment.paymentMethod =
      paystackData.data.channel;

    await payment.save();

    const refundApartmentPayment =
      async (reason) => {
        booking.bookingStatus =
          "cancelled";

        await booking.save();

        if (
          payment.refundStatus ===
            "pending" ||
          payment.refundStatus ===
            "refunded"
        ) {
          return {
            started: true,
            alreadyStarted: true
          };
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

                body:
                  JSON.stringify({
                    transaction:
                      payment.paymentReference
                  })
              }
            );

          const refundData =
            await refundResponse.json();

          if (
            !refundResponse.ok ||
            !refundData.status
          ) {
            payment.refundStatus =
              "failed";

            await payment.save();

            console.log(
              "APARTMENT REFUND FAILED:",
              reason
            );

            return {
              started: false
            };
          }

          payment.refundStatus =
            "pending";

          if (
            refundData.data &&
            refundData.data.id
          ) {
            payment.paystackRefundId =
              String(
                refundData.data.id
              );
          }

          await payment.save();

          console.log(
            "Apartment refund started:",
            reason
          );

          return {
            started: true
          };
        } catch (refundError) {
          console.log(
            "APARTMENT REFUND ERROR:",
            refundError
          );

          payment.refundStatus =
            "failed";

          await payment.save();

          return {
            started: false
          };
        }
      };

    if (
      amountPaid !== expectedAmount
    ) {
      const refundResult =
        await refundApartmentPayment(
          "Apartment payment amount does not match booking amount"
        );

      return res.status(400).send({
        message:
          refundResult.started
            ? "The amount paid does not match the apartment booking amount. The booking has been cancelled and a full refund has been initiated."
            : "The amount paid does not match the apartment booking amount. The booking has been cancelled, but the automatic refund could not be started.",

        data: {
          expectedAmount:
            expectedAmount / 100,

          amountPaid:
            amountPaid / 100
        }
      });
    }

    if (
      booking.bookingStatus ===
      "cancelled"
    ) {
      const refundResult =
        await refundApartmentPayment(
          "Payment completed for a cancelled apartment booking"
        );

      return res.status(400).send({
        message:
          refundResult.started
            ? "This apartment booking had already been cancelled. Payment was received and a full refund has been initiated."
            : "This apartment booking had already been cancelled. Payment was received, but the automatic refund could not be started."
      });
    }

    const apartment =
      await ApartmentModel.findById(
        booking.apartment
      );

    if (!apartment) {
      const refundResult =
        await refundApartmentPayment(
          "Apartment no longer exists"
        );

      return res.status(400).send({
        message:
          refundResult.started
            ? "Apartment is no longer available. A full refund has been initiated."
            : "Apartment is no longer available. Automatic refund could not be started."
      });
    }

    if (!apartment.isAvailable) {
      const refundResult =
        await refundApartmentPayment(
          "Apartment was disabled before booking confirmation"
        );

      return res.status(400).send({
        message:
          refundResult.started
            ? "Apartment is currently unavailable. A full refund has been initiated."
            : "Apartment is currently unavailable. Automatic refund could not be started."
      });
    }

    const {
      availableUnits
    } =
      await getApartmentAvailability({
        apartmentId:
          apartment._id,

        totalUnits:
          apartment.totalUnits,

        stayType:
          booking.stayType,

        checkInDate:
          booking.checkInDate,

        checkOutDate:
          booking.checkOutDate,

        expectedCheckInTime:
          booking.expectedCheckInTime,

        excludeBookingId:
          booking._id
      });

    if (
      booking.numberOfUnits >
      availableUnits
    ) {
      const refundResult =
        await refundApartmentPayment(
          "Rooms became unavailable before final payment confirmation"
        );

      return res.status(400).send({
        message:
          refundResult.started
            ? `Only ${availableUnits} room(s) are currently available. Your booking could not be confirmed and a full refund has been initiated.`
            : `Only ${availableUnits} room(s) are currently available. Your booking could not be confirmed, but the automatic refund could not be started.`,

        availableUnits
      });
    }

    booking.paymentStatus =
      "paid";

    booking.bookingStatus =
      "confirmed";

    await booking.save();

    const apartmentTicket =
      await createApartmentTicket(
        booking
      );

    return res.status(200).send({
      message:
        "Apartment payment verified successfully",

      data: {
        payment,
        booking,
        ticket:
          apartmentTicket
      }
    });
  } catch (error) {
    console.log(
      "VERIFY APARTMENT PAYMENT ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot verify apartment payment at this time",

      error:
        error.message
    });
  }
};

module.exports = {
  initializeApartmentPayment,
  verifyApartmentPayment
};