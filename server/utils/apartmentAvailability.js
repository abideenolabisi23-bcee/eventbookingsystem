const mongoose = require("mongoose");
const ApartmentBookingModel =
  require("../models/apartmentBooking.model");



const getBookingWindow = (booking) => {
  let start;
  let end;

  if (booking.stayType === "day_use") {

    // Normal day-use starts at 8:00 AM
    start = new Date(
      booking.checkInDate
    );

  const [hours, minutes] = (
  booking.expectedCheckInTime || "08:00"
).split(":").map(Number);

start.setHours(hours, minutes, 0, 0);


    // ========================================
    // EARLY ACTUAL CHECKOUT
    // ========================================

    if (
      booking.stayStatus ===
        "checked_out" &&
      booking.checkedOutAt
    ) {

      const actualCheckOut =
        new Date(
          booking.checkedOutAt
        );


      // Add 1 hour cleaning time
      const cleanedAt =
        new Date(
          actualCheckOut.getTime() +
          60 * 60 * 1000
        );


      // Normal day-use room would become
      // available at 7:00 PM.
      const normalEnd =
        new Date(
          booking.checkInDate
        );

      normalEnd.setHours(
        19,
        0,
        0,
        0
      );


      // Only release early when the actual
      // checkout + cleaning is earlier than
      // the normal release time.
      end =
        cleanedAt < normalEnd
          ? cleanedAt
          : normalEnd;


      return {
        start,
        end
      };
    }


    // ========================================
    // NORMAL DAY-USE END
    //
    // Guest leaves by 6 PM.
    // Cleaning 6 PM - 7 PM.
    // ========================================

    end = new Date(
      booking.checkInDate
    );

    end.setHours(
      19,
      0,
      0,
      0
    );


    return {
      start,
      end
    };
  }


  // ==========================================
  // OVERNIGHT
  // ==========================================

  if (
    booking.stayType ===
    "overnight"
  ) {

    start = new Date(
      booking.checkInDate
    );


    // ========================================
    // EXPECTED CHECK-IN TIME
    // ========================================

    if (
      booking.expectedCheckInTime
    ) {

      const [
        hours,
        minutes
      ] =
        booking
          .expectedCheckInTime
          .split(":")
          .map(Number);


      start.setHours(
        hours,
        minutes,
        0,
        0
      );

   } else {
  start.setHours(0, 0, 0, 0);
}


    // ========================================
    // NORMAL OVERNIGHT RELEASE TIME
    //
    // Checkout: 12 PM
    // Cleaning: 12 PM - 1 PM
    // Available: 1 PM
    // ========================================

    const normalEnd =
      new Date(
        booking.checkOutDate
      );


    normalEnd.setHours(
      13,
      0,
      0,
      0
    );


    // ========================================
    // EARLY ACTUAL CHECKOUT
    // ========================================

    if (
      booking.stayStatus ===
        "checked_out" &&
      booking.checkedOutAt
    ) {

      const actualCheckOut =
        new Date(
          booking.checkedOutAt
        );


      // Add 1 hour for cleaning.
      const cleanedAt =
        new Date(
          actualCheckOut.getTime() +
          60 * 60 * 1000
        );


      // Never make the reservation longer
      // because of a late checkout timestamp.
      //
      // This helper only handles EARLY
      // release of inventory.
      end =
        cleanedAt < normalEnd
          ? cleanedAt
          : normalEnd;


      return {
        start,
        end
      };
    }


    // ========================================
    // NORMAL OVERNIGHT END
    // ========================================

    end = normalEnd;


    return {
      start,
      end
    };
  }


  // ==========================================
  // INVALID STAY TYPE
  // ==========================================

  return {
    start: null,
    end: null
  };
};


const getApartmentAvailability = async ({
  apartmentId,
  totalUnits,
  stayType,
  checkInDate,
  checkOutDate,
  expectedCheckInTime = null,
  excludeBookingId = null,
  session = null
}) => {

  // ========================================
  // BUILD REQUESTED OCCUPANCY WINDOW
  // ========================================

  const requestedBooking = {
    stayType,
    checkInDate,
    checkOutDate,
    expectedCheckInTime
  };

  const {
    start: requestedStart,
    end: requestedEnd
  } = getBookingWindow(
    requestedBooking
  );


  if (
    !requestedStart ||
    !requestedEnd
  ) {
    throw new Error(
      "Invalid apartment stay type"
    );
  }


  // ========================================
  // ACTIVE BOOKINGS
  //
  // Confirmed bookings occupy rooms.
  //
  // Pending bookings only occupy rooms while
  // their 15-minute hold is still active.
  // ========================================

  const now = new Date();

 const query = {
  apartment: apartmentId,

  $or: [
    {
      bookingStatus: "confirmed",
      paymentStatus: "paid"
    },

    {
      bookingStatus: "pending",
      paymentStatus: "pending",
      expiresAt: {
        $gt: now
      }
    }
  ]
};

  // Used when checking an existing booking.
  // We must not count the booking against itself.

  if (excludeBookingId) {
    query._id = {
      $ne: excludeBookingId
    };
  }


  const bookings = await ApartmentBookingModel.find(query)
  .session(session);

  // ========================================
  // CREATE OCCUPANCY TIMELINE
  // ========================================

  const timeline = [];


  for (const booking of bookings) {

    const {
      start: existingStart,
      end: existingEnd
    } = getBookingWindow(
      booking
    );


    if (
      !existingStart ||
      !existingEnd
    ) {
      continue;
    }


    // ======================================
    // FIND THE PART THAT OVERLAPS THE
    // CUSTOMER'S REQUEST
    // ======================================

    const overlapStart =
      existingStart > requestedStart
        ? existingStart
        : requestedStart;


    const overlapEnd =
      existingEnd < requestedEnd
        ? existingEnd
        : requestedEnd;


    // No overlap
    if (
      overlapStart >= overlapEnd
    ) {
      continue;
    }


    // Booking starts occupying rooms
    timeline.push({
      time:
        overlapStart.getTime(),

      change:
        booking.numberOfUnits
    });


    // Booking stops occupying rooms
    timeline.push({
      time:
        overlapEnd.getTime(),

      change:
        -booking.numberOfUnits
    });
  }


  // ========================================
  // SORT TIMELINE
  //
  // If one booking ends exactly when another
  // starts, process the ending first.
  // ========================================

  timeline.sort(
    (a, b) =>
      a.time - b.time ||
      a.change - b.change
  );


  // ========================================
  // FIND PEAK NUMBER OF OCCUPIED ROOMS
  // ========================================

  let currentlyReserved = 0;

  let peakReservedUnits = 0;


  for (const point of timeline) {

    currentlyReserved +=
      point.change;


    if (
      currentlyReserved >
      peakReservedUnits
    ) {
      peakReservedUnits =
        currentlyReserved;
    }
  }


  // ========================================
  // AVAILABLE ROOMS
  // ========================================

  const availableUnits =
    Math.max(
      totalUnits -
        peakReservedUnits,
      0
    );


  return {
    requestedStart,
    requestedEnd,
    peakReservedUnits,
    availableUnits
  };
};


module.exports = {
  getBookingWindow,
  getApartmentAvailability
};