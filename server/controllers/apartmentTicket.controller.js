const ApartmentTicketModel = require("../models/apartmentTicket.model");

const getMyApartmentTickets = async (req, res) => {
  try {
    const userId = req.user.id;

    const tickets = await ApartmentTicketModel.find({
      user: userId
    })
      .populate({
        path: "apartment",
        select:
          "title apartmentType location pricePerNight dayUsePrice images"
      })
      .populate({
        path: "booking",
        select:
          "bookingReference stayType checkInDate checkOutDate expectedCheckInTime numberOfUnits numberOfNights totalAmount bookingStatus paymentStatus stayStatus checkedInAt checkedOutAt"
      })
      .sort({
        createdAt: -1
      });

    return res.status(200).send({
      message: "Apartment tickets fetched successfully",
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    console.log(
      "GET MY APARTMENT TICKETS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch apartment tickets at this time",
      error: error.message
    });
  }
};

const getApartmentTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;

    const ticket = await ApartmentTicketModel.findOne({
      _id: ticketId,
      user: userId
    })
      .populate({
        path: "user",
        select: "firstname lastname email"
      })
      .populate({
        path: "apartment",
        select:
          "title apartmentType location pricePerNight dayUsePrice images"
      })
      .populate({
        path: "booking",
        select:
          "bookingReference stayType checkInDate checkOutDate expectedCheckInTime numberOfUnits numberOfNights totalAmount bookingStatus paymentStatus stayStatus checkedInAt checkedOutAt"
      });

    if (!ticket) {
      return res.status(404).send({
        message: "Apartment ticket not found"
      });
    }

    return res.status(200).send({
      message:
        "Apartment ticket fetched successfully",
      data: ticket
    });
  } catch (error) {
    console.log(
      "GET APARTMENT TICKET ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch apartment ticket at this time",
      error: error.message
    });
  }
};

const validateApartmentTicket = async (req, res) => {
  try {
    const organizerId = req.user.id;

    const {
      ticketCode,
      qrData
    } = req.body;

    let code = "";

    if (qrData) {
      const scannedData = String(qrData).trim();

      if (!scannedData.startsWith("APARTMENT:")) {
        return res.status(400).send({
          valid: false,
          message:
            "This QR code is not an apartment ticket"
        });
      }

      code = scannedData
        .replace("APARTMENT:", "")
        .trim();
    } else if (ticketCode) {
      code = String(ticketCode).trim();
    }

    if (!code) {
      return res.status(400).send({
        valid: false,
        message:
          "Apartment ticket code is required"
      });
    }

    const ticket = await ApartmentTicketModel.findOne({
      ticketCode: code
    })
      .populate({
        path: "user",
        select:
          "firstname lastname email profilePicture"
      })
      .populate({
        path: "apartment",
        select:
          "title apartmentType location createdBy images isAvailable"
      })
      .populate({
        path: "booking",
        select:
          "bookingReference stayType checkInDate checkOutDate expectedCheckInTime numberOfUnits numberOfNights totalAmount bookingStatus paymentStatus stayStatus checkedInAt checkedOutAt"
      });

    if (!ticket) {
      return res.status(404).send({
        valid: false,
        message: "Apartment ticket not found"
      });
    }

    if (!ticket.apartment) {
      return res.status(404).send({
        valid: false,
        message:
          "Apartment connected to this ticket was not found"
      });
    }

    if (!ticket.booking) {
      return res.status(404).send({
        valid: false,
        message:
          "Booking connected to this ticket was not found"
      });
    }

    if (!ticket.user) {
      return res.status(404).send({
        valid: false,
        message:
          "Guest connected to this ticket was not found"
      });
    }

    if (!ticket.apartment.createdBy) {
      return res.status(403).send({
        valid: false,
        message:
          "Apartment ownership information is unavailable"
      });
    }
if (!ticket.apartment.createdBy) {
  return res.status(403).send({
    valid: false,
    message:
      "Apartment ownership information is unavailable"
  });
}

console.log("LOGGED-IN ORGANIZER:", organizerId.toString());

console.log(
  "APARTMENT OWNER:",
  ticket.apartment.createdBy.toString()
);

console.log("APARTMENT:", ticket.apartment.title);

if (
  ticket.apartment.createdBy.toString() !==
  organizerId.toString()
) {
  return res.status(403).send({
    valid: false,
    message:
      "You are not authorized to scan this apartment ticket"
  });
}
    if (
      ticket.apartment.createdBy.toString() !==
      organizerId.toString()
    ) {
      return res.status(403).send({
        valid: false,
        message:
          "You are not authorized to scan this apartment ticket"
      });
    }

  if (ticket.status !== "valid") {
  return res.status(400).send({
    valid: false,
    message:
      ticket.status === "used"
        ? "This apartment ticket has already been used"
        : "This apartment ticket is no longer valid"
  });
}

    if (
      ticket.booking.bookingStatus === "cancelled"
    ) {
      return res.status(400).send({
        valid: false,
        message:
          "This apartment booking has been cancelled"
      });
    }

    if (
      ticket.booking.bookingStatus !== "confirmed"
    ) {
      return res.status(400).send({
        valid: false,
        message:
          "This apartment booking is not confirmed"
      });
    }

    if (
      ticket.booking.paymentStatus !== "paid"
    ) {
      return res.status(400).send({
        valid: false,
        message:
          "Payment for this apartment booking has not been completed"
      });
    }

    if (
      ticket.booking.stayStatus === "checked_out"
    ) {
      return res.status(200).send({
        valid: false,
        message:
          "This guest has already checked out",
        data: {
          ticketId: ticket._id,
          ticketCode: ticket.ticketCode,
          ticketStatus: ticket.status,
          bookingId: ticket.booking._id,
          bookingReference:
            ticket.booking.bookingReference,
          stayStatus:
            ticket.booking.stayStatus,
          checkedInAt:
            ticket.booking.checkedInAt,
          checkedOutAt:
            ticket.booking.checkedOutAt,
          guest: {
            id: ticket.user._id,
            firstname:
              ticket.user.firstname,
            lastname:
              ticket.user.lastname,
            email:
              ticket.user.email,
            profilePicture:
              ticket.user.profilePicture || null
          },
          apartment: {
            id: ticket.apartment._id,
            title:
              ticket.apartment.title,
            apartmentType:
              ticket.apartment.apartmentType,
            location:
              ticket.apartment.location,
            images:
              ticket.apartment.images || {}
          }
        }
      });
    }

    if (
      ticket.booking.stayStatus === "checked_in"
    ) {
      return res.status(200).send({
        valid: false,
        message:
          "This guest has already checked in",
        data: {
          ticketId: ticket._id,
          ticketCode: ticket.ticketCode,
          ticketStatus: ticket.status,
          bookingId: ticket.booking._id,
          bookingReference:
            ticket.booking.bookingReference,
          stayStatus:
            ticket.booking.stayStatus,
          checkedInAt:
            ticket.booking.checkedInAt,
          guest: {
            id: ticket.user._id,
            firstname:
              ticket.user.firstname,
            lastname:
              ticket.user.lastname,
            email:
              ticket.user.email,
            profilePicture:
              ticket.user.profilePicture || null
          },
          apartment: {
            id: ticket.apartment._id,
            title:
              ticket.apartment.title,
            apartmentType:
              ticket.apartment.apartmentType,
            location:
              ticket.apartment.location,
            images:
              ticket.apartment.images || {}
          }
        }
      });
    }

    return res.status(200).send({
      valid: true,
      message:
        "Apartment ticket is valid",
      data: {
        ticketId: ticket._id,
        ticketCode: ticket.ticketCode,
        ticketStatus: ticket.status,

        bookingId: ticket.booking._id,

        bookingReference:
          ticket.booking.bookingReference,

        guest: {
          id: ticket.user._id,
          firstname:
            ticket.user.firstname,
          lastname:
            ticket.user.lastname,
          email:
            ticket.user.email,
          profilePicture:
            ticket.user.profilePicture || null
        },

        apartment: {
          id: ticket.apartment._id,
          title:
            ticket.apartment.title,
          apartmentType:
            ticket.apartment.apartmentType,
          location:
            ticket.apartment.location,
          images:
            ticket.apartment.images || {}
        },

        stayType:
          ticket.booking.stayType,

        checkInDate:
          ticket.booking.checkInDate,

        checkOutDate:
          ticket.booking.checkOutDate,

        expectedCheckInTime:
          ticket.booking.expectedCheckInTime,

        numberOfUnits:
          ticket.booking.numberOfUnits,

        numberOfNights:
          ticket.booking.numberOfNights,

        totalAmount:
          ticket.booking.totalAmount,

        bookingStatus:
          ticket.booking.bookingStatus,

        paymentStatus:
          ticket.booking.paymentStatus,

        stayStatus:
          ticket.booking.stayStatus,

        checkedInAt:
          ticket.booking.checkedInAt,

        checkedOutAt:
          ticket.booking.checkedOutAt
      }
    });
  } catch (error) {
    console.log(
      "VALIDATE APARTMENT TICKET ERROR:",
      error
    );

    return res.status(500).send({
      valid: false,
      message:
        "Cannot validate apartment ticket at this time",
      error: error.message
    });
  }
};

module.exports = {
  getMyApartmentTickets,
  getApartmentTicketById,
  validateApartmentTicket
};