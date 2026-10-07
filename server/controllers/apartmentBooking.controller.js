const ApartmentModel = require("../models/apartment.model");
const ApartmentBookingModel = require("../models/apartmentBooking.model");
const {
  getApartmentAvailability
} = require("../utils/apartmentAvailability");
const crypto = require("crypto");

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

    // ==========================================
    // FIND APARTMENT
    // ==========================================

    const apartment =
      await ApartmentModel.findById(
        apartmentId
      );

    if (!apartment) {
      return res.status(404).send({
        message: "Apartment not found"
      });
    }

    if (!apartment.isAvailable) {
      return res.status(400).send({
        message:
          "Apartment is currently unavailable"
      });
    }


    // ==========================================
    // VALIDATE STAY TYPE
    // ==========================================

    if (
      !["day_use", "overnight"].includes(
        stayType
      )
    ) {
      return res.status(400).send({
        message:
          "Stay type must be day_use or overnight"
      });
    }


    // ==========================================
    // CONVERT DATES
    // ==========================================

    const checkIn =
      new Date(checkInDate);

    const checkOut =
      new Date(checkOutDate);

    if (
      isNaN(checkIn.getTime()) ||
      isNaN(checkOut.getTime())
    ) {
      return res.status(400).send({
        message:
          "Invalid check-in or check-out date"
      });
    }


    // ==========================================
    // VALIDATE NUMBER OF ROOMS
    // ==========================================

    const units =
      Number(numberOfUnits);

    if (
      !Number.isInteger(units) ||
      units < 1
    ) {
      return res.status(400).send({
        message:
          "Number of units must be at least 1"
      });
    }

    if (
      units > apartment.totalUnits
    ) {
      return res.status(400).send({
        message:
          `This apartment has only ${apartment.totalUnits} unit(s)`
      });
    }


    let numberOfNights = 0;
    let totalAmount = 0;


    // ==========================================
    // DAY USE
    // ==========================================

    if (stayType === "day_use") {

      // Day use must be on one date
      if (
        checkIn.toDateString() !==
        checkOut.toDateString()
      ) {
        return res.status(400).send({
          message:
            "Day use check-in and check-out must be on the same date"
        });
      }

      // Day use doesn't need expectedCheckInTime
      totalAmount =
        apartment.dayUsePrice *
        units;
    }


    // ==========================================
    // OVERNIGHT
    // ==========================================

    if (stayType === "overnight") {

      if (checkOut <= checkIn) {
        return res.status(400).send({
          message:
            "Check-out date must be after check-in date"
        });
      }


      // ----------------------------------------
      // EXPECTED CHECK-IN TIME IS REQUIRED
      // Example: "14:00" = 2 PM
      // ----------------------------------------

      if (!expectedCheckInTime) {
        return res.status(400).send({
          message:
            "Expected check-in time is required for overnight stay"
        });
      }


      // Validate HH:MM format
      const timePattern =
        /^([01]\d|2[0-3]):([0-5]\d)$/;

      if (
        !timePattern.test(
          expectedCheckInTime
        )
      ) {
        return res.status(400).send({
          message:
            "Expected check-in time must be in HH:MM format, for example 14:00"
        });
      }


      const [checkInHour] =
  expectedCheckInTime
    .split(":")
    .map(Number);

      // Earliest normal overnight
      // check-in is 12 PM
      if (
        checkInHour < 12
      ) {
        return res.status(400).send({
          message:
            "Overnight check-in cannot be earlier than 12:00 PM"
        });
      }


      // ========================================
      // CALCULATE NUMBER OF NIGHTS
      // ========================================

      // Use date-only values so the customer's
      // expected arrival time does not change
      // the number of nights.

      const checkInDay =
        new Date(checkIn);

      checkInDay.setHours(
        0,
        0,
        0,
        0
      );

      const checkOutDay =
        new Date(checkOut);

      checkOutDay.setHours(
        0,
        0,
        0,
        0
      );

      const millisecondsPerDay =
        1000 * 60 * 60 * 24;

      numberOfNights =
        Math.round(
          (
            checkOutDay -
            checkInDay
          ) /
          millisecondsPerDay
        );


      if (numberOfNights < 1) {
        return res.status(400).send({
          message:
            "Overnight stay must be at least 1 night"
        });
      }


      totalAmount =
        apartment.pricePerNight *
        numberOfNights *
        units;
    }


    // ==========================================
    // CHECK CURRENT ROOM AVAILABILITY
    // ==========================================

    const {
      availableUnits,
      peakReservedUnits
    } =
      await getApartmentAvailability({
        apartmentId:
          apartment._id,

        totalUnits:
          apartment.totalUnits,

        stayType,

        checkInDate:
          checkIn,

        checkOutDate:
          checkOut,

        expectedCheckInTime:
          stayType === "overnight"
            ? expectedCheckInTime
            : null
      });


    console.log(
      "Apartment total units:",
      apartment.totalUnits
    );

    console.log(
      "Peak reserved units:",
      peakReservedUnits
    );

    console.log(
      "Available units:",
      availableUnits
    );


    // ==========================================
    // NOT ENOUGH ROOMS
    // ==========================================

    if (
      units > availableUnits
    ) {
      return res.status(400).send({
        message:
          `Only ${availableUnits} unit(s) are available for the selected date and time`
      });
    }


    // ==========================================
    // GENERATE BOOKING REFERENCE
    // ==========================================

    const bookingReference =
      `APT-BK-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;


    // ==========================================
    // CREATE 15-MINUTE HOLD
    // ==========================================

    const expiresAt =
      new Date(
        Date.now() +
        15 * 60 * 1000
      );


    // ==========================================
    // CREATE BOOKING
    // ==========================================

    const booking =
      await ApartmentBookingModel.create({
        user:
          req.user.id,

        apartment:
          apartmentId,

        stayType,

        checkInDate:
          checkIn,

        checkOutDate:
          checkOut,

        // Only overnight needs this
        expectedCheckInTime:
          stayType === "overnight"
            ? expectedCheckInTime
            : null,

        numberOfUnits:
          units,

        numberOfNights,

        totalAmount,

        bookingReference,

        expiresAt,

        bookingStatus:
          "pending",

        paymentStatus:
          "pending",

        stayStatus:
          "upcoming"
      });


    // ==========================================
    // SUCCESS
    // ==========================================

    return res.status(201).send({
      message:
        "Apartment booking created successfully",

      data: booking
    });

  } catch (error) {

    console.log(
      "CREATE APARTMENT BOOKING ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot create apartment booking at this time",

      error:
        error.message
    });
  }
};

const getMyApartmentBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await ApartmentBookingModel.find({
      user: userId
    })
      .populate(
        "apartment",
        "title description apartmentType location pricePerNight dayUsePrice image amenities"
      )
      .sort({ createdAt: -1 });

    return res.status(200).send({
      message: "Apartment bookings fetched successfully",
      data: bookings
    });

  } catch (error) {
    console.log(
      "GET APARTMENT BOOKINGS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch apartment bookings at this time"
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
      "title description apartmentType location pricePerNight dayUsePrice image amenities"
    );

    if (!booking) {
      return res.status(404).send({
        message: "Apartment booking not found"
      });
    }

    return res.status(200).send({
      message:
        "Apartment booking fetched successfully",
      data: booking
    });

  } catch (error) {
    console.log(
      "GET APARTMENT BOOKING ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch apartment booking at this time"
    });
  }
};

const cancelApartmentBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;


    // ==========================================
    // FIND THIS USER'S BOOKING
    // ==========================================

    const booking =
      await ApartmentBookingModel.findOne({
        _id: bookingId,
        user: userId
      });


    if (!booking) {
      return res.status(404).send({
        message: "Apartment booking not found"
      });
    }


    // ==========================================
    // ALREADY CANCELLED
    // ==========================================

    if (
      booking.bookingStatus === "cancelled"
    ) {
      return res.status(400).send({
        message:
          "Apartment booking is already cancelled"
      });
    }


    // ==========================================
    // ALREADY CHECKED IN
    // ==========================================

    if (
      booking.stayStatus === "checked_in"
    ) {
      return res.status(400).send({
        message:
          "You cannot cancel an apartment booking after check-in"
      });
    }


    // ==========================================
    // ALREADY CHECKED OUT
    // ==========================================

    if (
      booking.stayStatus === "checked_out"
    ) {
      return res.status(400).send({
        message:
          "You cannot cancel an apartment booking after check-out"
      });
    }


    // ==========================================
    // ALREADY REFUNDED
    // ==========================================

    if (
      booking.paymentStatus === "refunded"
    ) {
      return res.status(400).send({
        message:
          "This apartment booking has already been refunded"
      });
    }


    // ==========================================
    // UNPAID BOOKING
    // ==========================================

    if (
      booking.paymentStatus === "pending"
    ) {

      booking.bookingStatus =
        "cancelled";


      await booking.save();


      return res.status(200).send({
        message:
          "Apartment booking cancelled successfully",

        data: booking
      });
    }


    // ==========================================
    // PAID BOOKING
    // ==========================================

    if (
      booking.paymentStatus === "paid"
    ) {

      const apartmentPayment =
        await ApartmentPaymentModel
          .findOne({
            booking: booking._id,
            user: userId,
            status: "paid"
          })
          .sort({
            createdAt: -1
          });


      if (!apartmentPayment) {
        return res.status(404).send({
          message:
            "Payment record for this booking was not found"
        });
      }


      // ========================================
      // REFUND ALREADY PENDING
      // ========================================

      if (
        apartmentPayment.refundStatus ===
        "pending"
      ) {
        return res.status(400).send({
          message:
            "Refund for this apartment booking is already pending"
        });
      }


      // ========================================
      // ALREADY REFUNDED
      // ========================================

      if (
        apartmentPayment.refundStatus ===
        "refunded"
      ) {
        return res.status(400).send({
          message:
            "This apartment booking has already been refunded"
        });
      }


      // ========================================
      // CANCEL BOOKING FIRST
      //
      // This releases the apartment immediately.
      // The customer has already chosen to cancel.
      // ========================================

      booking.bookingStatus =
        "cancelled";


      await booking.save();


      // ========================================
      // REQUEST FULL REFUND FROM PAYSTACK
      // ========================================

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


        // ======================================
        // REFUND REQUEST FAILED
        // ======================================

        if (
          !refundResponse.ok ||
          !refundData.status
        ) {

          apartmentPayment.refundStatus =
            "failed";


          await apartmentPayment.save();


          return res.status(400).send({
            message:
              "Apartment booking was cancelled, but the refund could not be started",

            error:
              refundData.message ||
              "Paystack refund request failed"
          });
        }


        // ======================================
        // REFUND REQUEST ACCEPTED
        // ======================================

        apartmentPayment.refundStatus =
          "pending";


        if (
          refundData.data?.id
        ) {
          apartmentPayment.paystackRefundId =
            String(
              refundData.data.id
            );
        }


        await apartmentPayment.save();


        return res.status(200).send({
          message:
            "Apartment booking cancelled and refund started successfully",

          data: {
            booking,
            payment:
              apartmentPayment
          }
        });


      } catch (refundError) {

        console.log(
          "APARTMENT REFUND ERROR:",
          refundError
        );


        apartmentPayment.refundStatus =
          "failed";


        await apartmentPayment.save();


        return res.status(500).send({
          message:
            "Apartment booking was cancelled, but the refund could not be started",

          error:
            refundError.message
        });
      }
    }


    // ==========================================
    // OTHER PAYMENT STATUS
    // ==========================================

    return res.status(400).send({
      message:
        "Apartment booking cannot be cancelled"
    });


  } catch (error) {

    console.log(
      "CANCEL APARTMENT BOOKING ERROR:",
      error
    );


    return res.status(500).send({
      message:
        "Cannot cancel apartment booking at this time",

      error: error.message
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
    // ORGANIZER MUST OWN APARTMENT
    // ==========================================

    if (
      apartment.createdBy.toString() !==
      organizerId.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to check in guests for this apartment"
      });
    }


    // ==========================================
    // BOOKING MUST BE CONFIRMED
    // ==========================================

    if (
      booking.bookingStatus !==
      "confirmed"
    ) {
      return res.status(400).send({
        message:
          "Only confirmed bookings can be checked in"
      });
    }


    // ==========================================
    // BOOKING MUST BE PAID
    // ==========================================

    if (
      booking.paymentStatus !==
      "paid"
    ) {
      return res.status(400).send({
        message:
          "Only paid bookings can be checked in"
      });
    }


    // ==========================================
    // ALREADY CHECKED IN
    // ==========================================

    if (
      booking.stayStatus ===
      "checked_in"
    ) {
      return res.status(400).send({
        message:
          "Guest is already checked in"
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
    // CURRENT TIME
    // ==========================================

    const now = new Date();


    // ==========================================
    // BUILD ALLOWED CHECK-IN TIME
    // ==========================================

    const allowedCheckIn =
      new Date(
        booking.checkInDate
      );


    // ==========================================
    // BUILD FINAL CHECK-IN DEADLINE
    // ==========================================

    let checkInDeadline;


    // ==========================================
    // DAY USE
    //
    // Check-in:
    // 8:00 AM
    //
    // Day use ends:
    // 6:00 PM
    // ==========================================

    if (
      booking.stayType ===
      "day_use"
    ) {

      allowedCheckIn.setHours(
        8,
        0,
        0,
        0
      );


      checkInDeadline =
        new Date(
          booking.checkInDate
        );


      checkInDeadline.setHours(
        18,
        0,
        0,
        0
      );
    }


    // ==========================================
    // OVERNIGHT
    //
    // Use customer's expected arrival time.
    // ==========================================

    else if (
      booking.stayType ===
      "overnight"
    ) {

      if (
        !booking.expectedCheckInTime
      ) {
        return res.status(400).send({
          message:
            "Expected check-in time is missing for this booking"
        });
      }


      const [
        hours,
        minutes
      ] =
        booking
          .expectedCheckInTime
          .split(":")
          .map(Number);


      allowedCheckIn.setHours(
        hours,
        minutes,
        0,
        0
      );


      // Overnight reservation ends at
      // 12:00 PM on checkout date.

      checkInDeadline =
        new Date(
          booking.checkOutDate
        );


      checkInDeadline.setHours(
        12,
        0,
        0,
        0
      );
    }


    // ==========================================
    // INVALID STAY TYPE
    // ==========================================

    else {
      return res.status(400).send({
        message:
          "Invalid apartment stay type"
      });
    }


    // ==========================================
    // TOO EARLY
    // ==========================================

    if (
      now < allowedCheckIn
    ) {
      return res.status(400).send({
        message:
          "Guest cannot check in before the scheduled check-in time",

        checkInTime:
          allowedCheckIn
      });
    }


    // ==========================================
    // RESERVATION ALREADY ENDED
    // ==========================================

    if (
      now >= checkInDeadline
    ) {
      return res.status(400).send({
        message:
          "This apartment reservation has already ended and can no longer be checked in"
      });
    }


    // ==========================================
    // CHECK-IN SUCCESSFUL
    // ==========================================

    booking.stayStatus =
  "checked_in";

booking.checkedInAt =
  new Date();

await booking.save();


    return res.status(200).send({
      message:
        "Guest checked in successfully",

      data:
        booking
    });


  } catch (error) {

    console.log(
      "APARTMENT CHECK-IN ERROR:",
      error
    );


    return res.status(500).send({
      message:
        "Cannot check in guest at this time",

      error:
        error.message
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