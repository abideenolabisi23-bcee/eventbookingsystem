const mongoose = require("mongoose");
const ApartmentBookingLockModel = require("../models/apartmentBookingLock.model");
const ApartmentModel = require("../models/apartment.model");
const ApartmentBookingModel = require("../models/apartmentBooking.model");
const {
  getApartmentAvailability
} = require("../utils/apartmentAvailability");
const crypto = require("crypto");
const ApartmentPaymentModel = require("../models/apartmentPayment.model");

const createApartmentBooking = async (req, res) => {
  try {
    const {
      apartmentId,
      stayType,
      checkInDate,
      checkOutDate,
      numberOfUnits,
      expectedCheckInTime
    } = req.body;

    if (!mongoose.isValidObjectId(apartmentId)) {
      return res.status(400).send({
        message: "Invalid apartment ID"
      });
    }

    const apartment = await ApartmentModel.findById(apartmentId);

    if (!apartment) {
      return res.status(404).send({
        message: "Apartment not found"
      });
    }

    if (!apartment.isAvailable) {
      return res.status(400).send({
        message: "Apartment is currently unavailable"
      });
    }

    if (!["day_use", "overnight"].includes(stayType)) {
      return res.status(400).send({
        message: "Stay type must be day_use or overnight"
      });
    }

    if (!checkInDate || !checkOutDate) {
      return res.status(400).send({
        message: "Check-in and check-out dates are required"
      });
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (
      Number.isNaN(checkIn.getTime()) ||
      Number.isNaN(checkOut.getTime())
    ) {
      return res.status(400).send({
        message: "Invalid check-in or check-out date"
      });
    }

    const units = Number(numberOfUnits);

    if (!Number.isInteger(units) || units < 1) {
      return res.status(400).send({
        message: "Number of units must be at least 1"
      });
    }

    if (units > apartment.totalUnits) {
      return res.status(409).send({
        message: "Room occupied"
      });
    }

    if (
      expectedCheckInTime &&
      !/^([01]\d|2[0-3]):([0-5]\d)$/.test(expectedCheckInTime)
    ) {
      return res.status(400).send({
        message: "Invalid check-in time. Use HH:MM format"
      });
    }

    let numberOfNights = 0;
    let totalAmount = 0;

    if (stayType === "day_use") {
      if (
        checkIn.toDateString() !==
        checkOut.toDateString()
      ) {
        return res.status(400).send({
          message: "Day use check-in and check-out must be on the same date"
        });
      }

      if (expectedCheckInTime && expectedCheckInTime >= "18:00") {
        return res.status(400).send({
          message: "Day use check-in must be before 6:00 PM"
        });
      }

      totalAmount = apartment.dayUsePrice * units;
    }

    if (stayType === "overnight") {
      const checkInDay = new Date(checkIn);
      checkInDay.setHours(0, 0, 0, 0);

      const checkOutDay = new Date(checkOut);
      checkOutDay.setHours(0, 0, 0, 0);

      numberOfNights = Math.round(
        (checkOutDay - checkInDay) / (1000 * 60 * 60 * 24)
      );

      if (numberOfNights < 1) {
        return res.status(400).send({
          message: "Overnight stay must be at least 1 night"
        });
      }

      totalAmount =
        apartment.pricePerNight *
        numberOfNights *
        units;
    }

    const bookingReference = `APT-BK-${Date.now()}-${new mongoose.Types.ObjectId().toString()}`;

    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    );

    let booking;

    try {
      await mongoose.connection.transaction(
        async (session) => {
          await ApartmentBookingLockModel.findOneAndUpdate(
            {
              apartment: apartment._id
            },
            {
              $inc: {
                version: 1
              }
            },
            {
              upsert: true,
              new: true,
              session
            }
          );

          const currentApartment = await ApartmentModel.findById(
            apartment._id
          ).session(session);

          if (!currentApartment || !currentApartment.isAvailable) {
            const error = new Error("Apartment is currently unavailable");
            error.statusCode = 400;
            throw error;
          }

          if (units > currentApartment.totalUnits) {
            const error = new Error("Room occupied");
            error.statusCode = 409;
            throw error;
          }

          const { availableUnits } =
            await getApartmentAvailability({
              apartmentId: currentApartment._id,
              totalUnits: currentApartment.totalUnits,
              stayType,
              checkInDate: checkIn,
              checkOutDate: checkOut,
              expectedCheckInTime: expectedCheckInTime || null,
              session
            });

          if (units > availableUnits) {
            const error = new Error("Room occupied");
            error.statusCode = 409;
            throw error;
          }

          const createdBookings = await ApartmentBookingModel.create(
            [
              {
                user: req.user.id,
                apartment: currentApartment._id,
                stayType,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                expectedCheckInTime: expectedCheckInTime || null,
                numberOfUnits: units,
                numberOfNights,
                totalAmount,
                bookingReference,
                expiresAt,
                bookingStatus: "pending",
                paymentStatus: "pending",
                stayStatus: "upcoming"
              }
            ],
            {
              session
            }
          );

          booking = createdBookings[0];
        }
      );
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).send({
          message: error.message
        });
      }

      throw error;
    }

    return res.status(201).send({
      message: "Apartment booking created successfully",
      data: booking
    });
  } catch (error) {
    console.log("CREATE APARTMENT BOOKING ERROR:", error);

    return res.status(500).send({
      message: "Cannot create apartment booking at this time"
    });
  }
};

const getMyApartmentBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    await ApartmentBookingModel.updateMany(
      {
        user: userId,
        bookingStatus: "pending",
        paymentStatus: "pending",
        expiresAt: { $lte: new Date() }
      },
      {
        $set: {
          bookingStatus: "expired"
        }
      }
    );

    const bookings = await ApartmentBookingModel.find({
      user: userId
    })
      .populate(
        "apartment",
        "title description apartmentType location pricePerNight dayUsePrice images amenities"
      )
      .sort({ createdAt: -1 });

    return res.status(200).send({
      message: "Apartment bookings fetched successfully",
      data: bookings
    });
  } catch (error) {
    console.log("GET APARTMENT BOOKINGS ERROR:", error);

    return res.status(500).send({
      message: "Cannot fetch apartment bookings at this time"
    });
  }
};

const getApartmentBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await ApartmentBookingModel.findOne({
      _id: bookingId,
      user: userId
    }).populate(
      "apartment",
      "title description apartmentType location pricePerNight dayUsePrice images amenities"
    );

    if (!booking) {
      return res.status(404).send({
        message: "Apartment booking not found"
      });
    }

    return res.status(200).send({
      message: "Apartment booking fetched successfully",
      data: booking
    });

  } catch (error) {
    console.log("GET APARTMENT BOOKING ERROR:", error);

    return res.status(500).send({
      message: "Cannot fetch apartment booking at this time"
    });
  }
};

const cancelApartmentBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await ApartmentBookingModel.findOne({
      _id: bookingId,
      user: userId
    });

    if (!booking) {
      return res.status(404).send({
        message: "Apartment booking not found"
      });
    }

    if (
      booking.bookingStatus === "pending" &&
      booking.paymentStatus === "pending" &&
      booking.expiresAt &&
      booking.expiresAt <= new Date()
    ) {
      booking.bookingStatus = "expired";

      await booking.save();

      return res.status(400).send({
        message: "This apartment booking has expired and cannot be cancelled"
      });
    }

    if (booking.bookingStatus === "expired") {
      return res.status(400).send({
        message: "This apartment booking has expired and cannot be cancelled"
      });
    }

    if (booking.bookingStatus === "cancelled") {
      return res.status(400).send({
        message: "Apartment booking is already cancelled"
      });
    }

    if (booking.stayStatus === "checked_in") {
      return res.status(400).send({
        message: "You cannot cancel an apartment booking after check-in"
      });
    }

    if (booking.stayStatus === "checked_out") {
      return res.status(400).send({
        message: "You cannot cancel an apartment booking after check-out"
      });
    }

    if (booking.paymentStatus === "refunded") {
      return res.status(400).send({
        message: "This apartment booking has already been refunded"
      });
    }

    if (booking.paymentStatus === "pending") {
      booking.bookingStatus = "cancelled";

      await booking.save();

      return res.status(200).send({
        message: "Apartment booking cancelled successfully",
        data: booking
      });
    }

    if (booking.paymentStatus === "paid") {
      const apartmentPayment = await ApartmentPaymentModel.findOne({
        booking: booking._id,
        user: userId,
        status: "paid"
      }).sort({
        createdAt: -1
      });

      if (!apartmentPayment) {
        return res.status(404).send({
          message: "Payment record for this booking was not found"
        });
      }

      if (apartmentPayment.refundStatus === "pending") {
        return res.status(400).send({
          message: "Refund for this apartment booking is already pending"
        });
      }

      if (apartmentPayment.refundStatus === "refunded") {
        return res.status(400).send({
          message: "This apartment booking has already been refunded"
        });
      }

      if (!apartmentPayment.paymentReference) {
        return res.status(400).send({
          message: "Payment reference is missing. Please contact support."
        });
      }

      if (!process.env.PAYSTACK_SECRET_KEY) {
        return res.status(500).send({
          message: "Payment refund service is not configured"
        });
      }

      booking.bookingStatus = "cancelled";

      await booking.save();

      try {
        const refundResponse = await fetch(
          "https://api.paystack.co/refund",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              transaction: apartmentPayment.paymentReference
            })
          }
        );

        const refundData = await refundResponse.json();

        if (!refundResponse.ok || !refundData.status) {
          apartmentPayment.refundStatus = "failed";

          await apartmentPayment.save();

          return res.status(400).send({
            message:
              "Apartment booking was cancelled, but the refund could not be started. Please contact support.",
            bookingCancelled: true,
            refundStatus: "failed"
          });
        }

        apartmentPayment.refundStatus = "pending";

        if (refundData.data?.id) {
          apartmentPayment.paystackRefundId = String(
            refundData.data.id
          );
        }

        await apartmentPayment.save();

        return res.status(200).send({
          message:
            "Apartment booking cancelled successfully. Your refund request is being processed.",
          data: {
            booking,
            refundStatus: apartmentPayment.refundStatus,
            paystackRefundId:
              apartmentPayment.paystackRefundId || null
          }
        });
      } catch (refundError) {
        console.error(
          "APARTMENT REFUND ERROR:",
          refundError
        );

        apartmentPayment.refundStatus = "failed";

        await apartmentPayment.save();

        return res.status(500).send({
          message:
            "Apartment booking was cancelled, but the refund could not be started. Please contact support.",
          bookingCancelled: true,
          refundStatus: "failed"
        });
      }
    }

    return res.status(400).send({
      message: "Apartment booking cannot be cancelled"
    });
  } catch (error) {
    console.error(
      "CANCEL APARTMENT BOOKING ERROR:",
      error
    );

    return res.status(500).send({
      message: "Cannot cancel apartment booking at this time"
    });
  }
};

const getApartmentBookingsForOrganizer = async (
  req,
  res
) => {
  try {
    const { apartmentId } = req.params;
    const organizerId = req.user.id;

    // Find the apartment
    const apartment = await ApartmentModel.findById(
      apartmentId
    );

    if (!apartment) {
      return res.status(404).send({
        message: "Apartment not found"
      });
    }

    // Make sure this organizer owns the apartment
    if (
      apartment.createdBy.toString() !==
      organizerId.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to view bookings for this apartment"
      });
    }

    // Get all bookings for this apartment
    const bookings =
      await ApartmentBookingModel.find({
        apartment: apartmentId
      })
        .populate(
          "user",
          "firstname lastname email"
        )
        .sort({ createdAt: -1 });

    return res.status(200).send({
      message:
        "Apartment bookings fetched successfully",
      data: {
        apartment: {
          _id: apartment._id,
          title: apartment.title,
          location: apartment.location,
          apartmentType: apartment.apartmentType,
          totalUnits: apartment.totalUnits
        },
        totalBookings: bookings.length,
        bookings
      }
    });

  } catch (error) {
    console.log(
      "GET ORGANIZER APARTMENT BOOKINGS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch apartment bookings at this time",
      error: error.message
    });
  }
};

const checkInApartmentGuest = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const organizerId = req.user.id;

    const booking = await ApartmentBookingModel.findById(bookingId);

    if (!booking) {
      return res.status(404).send({
        message: "Apartment booking not found"
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

    if (
      apartment.createdBy.toString() !==
      organizerId.toString()
    ) {
      return res.status(403).send({
        message: "You are not authorized to check in guests for this apartment"
      });
    }

    if (booking.bookingStatus !== "confirmed") {
      return res.status(400).send({
        message: "Only confirmed bookings can be checked in"
      });
    }

    if (booking.paymentStatus !== "paid") {
      return res.status(400).send({
        message: "Only paid bookings can be checked in"
      });
    }

    if (booking.stayStatus === "checked_in") {
      return res.status(400).send({
        message: "Guest is already checked in"
      });
    }

    if (booking.stayStatus === "checked_out") {
      return res.status(400).send({
        message: "Guest has already checked out"
      });
    }

    const now = new Date();

    const allowedCheckIn = new Date(
      booking.checkInDate
    );

    const checkInDeadline = new Date(
      booking.checkOutDate
    );

    if (booking.stayType === "day_use") {
      checkInDeadline.setHours(18, 0, 0, 0);
    } else if (booking.stayType === "overnight") {
      checkInDeadline.setHours(12, 0, 0, 0);
    } else {
      return res.status(400).send({
        message: "Invalid apartment stay type"
      });
    }

    if (booking.expectedCheckInTime) {
      const [hours, minutes] = booking.expectedCheckInTime
        .split(":")
        .map(Number);

      allowedCheckIn.setHours(
        hours,
        minutes,
        0,
        0
      );
    } else {
      allowedCheckIn.setHours(
        0,
        0,
        0,
        0
      );
    }

    if (now < allowedCheckIn) {
      return res.status(400).send({
        message: "Guest cannot check in before the scheduled check-in time",
        checkInTime: allowedCheckIn
      });
    }

    if (now >= checkInDeadline) {
      return res.status(400).send({
        message: "This apartment reservation has already ended and can no longer be checked in"
      });
    }

    booking.stayStatus = "checked_in";
    booking.checkedInAt = new Date();

    await booking.save();

    return res.status(200).send({
      message: "Guest checked in successfully",
      data: booking
    });

  } catch (error) {
    console.log("APARTMENT CHECK-IN ERROR:", error);

    return res.status(500).send({
      message: "Cannot check in guest at this time",
      error: error.message
    });
  }
};

const checkOutApartmentGuest = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const organizerId = req.user.id;


    // ==========================================
    // FIND BOOKING
    // ==========================================

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


    // ==========================================
    // FIND APARTMENT
    // ==========================================

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


    // ==========================================
    // MAKE SURE ORGANIZER OWNS APARTMENT
    // ==========================================

    if (
      apartment.createdBy.toString() !==
      organizerId.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to check out guests for this apartment"
      });
    }


    // ==========================================
    // CANCELLED BOOKING
    // ==========================================

    if (
      booking.bookingStatus ===
      "cancelled"
    ) {
      return res.status(400).send({
        message:
          "A cancelled booking cannot be checked out"
      });
    }


    // ==========================================
    // MUST CHECK IN FIRST
    // ==========================================

    if (
      booking.stayStatus ===
      "upcoming"
    ) {
      return res.status(400).send({
        message:
          "Guest must be checked in before checking out"
      });
    }


    // ==========================================
    // ALREADY CHECKED OUT
    // ==========================================

    if (
      booking.stayStatus ===
      "checked_out"
    ) {
      return res.status(400).send({
        message:
          "Guest has already checked out"
      });
    }


    // ==========================================
    // CHECK-OUT
    //
    // We allow the organizer to check the
    // customer out early if the customer
    // actually leaves early.
    // ==========================================

   booking.stayStatus =
  "checked_out";

booking.checkedOutAt =
  new Date();

await booking.save();


    return res.status(200).send({
      message:
        "Guest checked out successfully",

      data: booking
    });


  } catch (error) {

    console.log(
      "APARTMENT CHECK-OUT ERROR:",
      error
    );


    return res.status(500).send({
      message:
        "Cannot check out guest at this time",

      error:
        error.message
    });
  }
};

const getApartmentBookingStats = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const organizerId = req.user.id;

    // Find apartment
    const apartment =
      await ApartmentModel.findById(apartmentId);

    if (!apartment) {
      return res.status(404).send({
        message: "Apartment not found"
      });
    }

    // Make sure organizer owns this apartment
    if (
      apartment.createdBy.toString() !==
      organizerId.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to view statistics for this apartment"
      });
    }

    // Get all bookings for this apartment
    const bookings =
      await ApartmentBookingModel.find({
        apartment: apartmentId
      });

    const totalBookings = bookings.length;

    const pendingBookings = bookings.filter(
      (booking) =>
        booking.bookingStatus === "pending"
    ).length;

    const confirmedBookings = bookings.filter(
      (booking) =>
        booking.bookingStatus === "confirmed"
    ).length;

    const cancelledBookings = bookings.filter(
      (booking) =>
        booking.bookingStatus === "cancelled"
    ).length;

    const checkedInGuests = bookings.filter(
      (booking) =>
        booking.stayStatus === "checked_in"
    ).length;

    const checkedOutGuests = bookings.filter(
      (booking) =>
        booking.stayStatus === "checked_out"
    ).length;

    // Count units from confirmed bookings
    const confirmedUnits = bookings
      .filter(
        (booking) =>
          booking.bookingStatus === "confirmed"
      )
      .reduce(
        (total, booking) =>
          total + booking.numberOfUnits,
        0
      );

    // Revenue from paid, non-cancelled bookings
    const totalRevenue = bookings
      .filter(
        (booking) =>
          booking.paymentStatus === "paid" &&
          booking.bookingStatus === "confirmed"
      )
      .reduce(
        (total, booking) =>
          total + booking.totalAmount,
        0
      );

    return res.status(200).send({
      message:
        "Apartment booking statistics fetched successfully",

      data: {
        apartment: {
          _id: apartment._id,
          title: apartment.title,
          location: apartment.location,
          totalUnits: apartment.totalUnits
        },

        totalBookings,
        pendingBookings,
        confirmedBookings,
        cancelledBookings,
        confirmedUnits,
        checkedInGuests,
        checkedOutGuests,
        totalRevenue
      }
    });

  } catch (error) {
    console.log(
      "APARTMENT BOOKING STATS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch apartment booking statistics at this time"
    });
  }
};

const getApartmentBookingByReference =
  async (req, res) => {
    try {
      const {
        bookingReference
      } = req.params;

      const organizerId =
        req.user.id;


      // ========================================
      // FIND BOOKING
      // ========================================

      const booking =
        await ApartmentBookingModel
          .findOne({
            bookingReference
          })
          .populate(
            "user",
            "firstname lastname email"
          )
          .populate(
            "apartment",
            "title location apartmentType createdBy"
          );


      // ========================================
      // BOOKING NOT FOUND
      // ========================================

      if (!booking) {
        return res.status(404).send({
          message:
            "Apartment booking not found"
        });
      }


      // ========================================
      // MAKE SURE APARTMENT STILL EXISTS
      // ========================================

      if (!booking.apartment) {
        return res.status(404).send({
          message:
            "Apartment for this booking was not found"
        });
      }


      // ========================================
      // ORGANIZER OWNERSHIP CHECK
      //
      // Organizer can only verify guests
      // booked into their own apartment.
      // ========================================

      if (
        booking.apartment.createdBy
          .toString() !==
        organizerId.toString()
      ) {
        return res.status(403).send({
          message:
            "You are not authorized to view this apartment booking"
        });
      }


      // ========================================
      // RETURN BOOKING INFORMATION
      // ========================================

      return res.status(200).send({
        message:
          "Apartment booking fetched successfully",

        data: {
          bookingId:
            booking._id,

          bookingReference:
            booking.bookingReference,

          guest:
            booking.user,

          apartment:
            booking.apartment,

          stayType:
            booking.stayType,

          checkInDate:
            booking.checkInDate,

          checkOutDate:
            booking.checkOutDate,

          expectedCheckInTime:
            booking.expectedCheckInTime,

          numberOfUnits:
            booking.numberOfUnits,

          numberOfNights:
            booking.numberOfNights,

          totalAmount:
            booking.totalAmount,

          bookingStatus:
            booking.bookingStatus,

          paymentStatus:
            booking.paymentStatus,

          stayStatus:
            booking.stayStatus
        }
      });


    } catch (error) {

      console.log(
        "GET APARTMENT BOOKING BY REFERENCE ERROR:",
        error
      );


      return res.status(500).send({
        message:
          "Cannot fetch apartment booking at this time",

        error:
          error.message
      });
    }
  };

const getApartmentBookingByCheckInToken =
  async (req, res) => {
    try {
      const { checkInToken } =
        req.params;

      const organizerId =
        req.user.id;


      // ========================================
      // FIND BOOKING USING QR TOKEN
      // ========================================

      const booking =
        await ApartmentBookingModel
          .findOne({
            checkInToken
          })
          .populate(
            "user",
            "firstname lastname email"
          )
          .populate(
            "apartment",
            "title location apartmentType createdBy"
          );


      // ========================================
      // BOOKING NOT FOUND
      // ========================================

      if (!booking) {
        return res.status(404).send({
          message:
            "Invalid apartment check-in QR code"
        });
      }


      // ========================================
      // APARTMENT MUST EXIST
      // ========================================

      if (!booking.apartment) {
        return res.status(404).send({
          message:
            "Apartment for this booking was not found"
        });
      }


      // ========================================
      // ORGANIZER OWNERSHIP
      //
      // Organizer cannot scan a booking
      // belonging to another organizer.
      // ========================================

      if (
        booking.apartment.createdBy
          .toString() !==
        organizerId.toString()
      ) {
        return res.status(403).send({
          message:
            "You are not authorized to verify this apartment booking"
        });
      }


      // ========================================
      // RETURN BOOKING FOR REVIEW
      //
      // Scanning does NOT check the guest in.
      // ========================================

      return res.status(200).send({
        message:
          "Apartment check-in information fetched successfully",

        data: {
          bookingId:
            booking._id,

          bookingReference:
            booking.bookingReference,

          guest:
            booking.user,

          apartment:
            booking.apartment,

          stayType:
            booking.stayType,

          checkInDate:
            booking.checkInDate,

          checkOutDate:
            booking.checkOutDate,

          expectedCheckInTime:
            booking.expectedCheckInTime,

          numberOfUnits:
            booking.numberOfUnits,

          numberOfNights:
            booking.numberOfNights,

          totalAmount:
            booking.totalAmount,

          bookingStatus:
            booking.bookingStatus,

          paymentStatus:
            booking.paymentStatus,

          stayStatus:
            booking.stayStatus
        }
      });


    } catch (error) {

      console.log(
        "GET APARTMENT BOOKING BY CHECK-IN TOKEN ERROR:",
        error
      );


      return res.status(500).send({
        message:
          "Cannot verify apartment check-in QR code at this time",

        error:
          error.message
      });
    }
  };

module.exports = {
  createApartmentBooking,
  getMyApartmentBookings,
  getApartmentBookingById,
  cancelApartmentBooking,
  getApartmentBookingsForOrganizer,
  checkInApartmentGuest,
  checkOutApartmentGuest,
  getApartmentBookingStats,
  getApartmentBookingByReference,
  getApartmentBookingByCheckInToken
};