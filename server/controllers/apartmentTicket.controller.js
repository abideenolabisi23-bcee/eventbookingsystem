const ApartmentTicketModel =
  require("../models/apartmentTicket.model");

const getMyApartmentTickets = async (
  req,
  res
) => {
  const { id } = req.user;

  try {
    const tickets =
      await ApartmentTicketModel.find({
        user: id
      })
        .populate(
          "apartment",
          "title description location apartmentType images amenities pricePerNight dayUsePrice"
        )
        .populate({
          path: "booking",
          select:
            "stayType checkInDate checkOutDate expectedCheckInTime numberOfUnits numberOfNights totalAmount bookingReference bookingStatus paymentStatus stayStatus checkedInAt checkedOutAt"
        })
        .sort({
          createdAt: -1
        });

    return res.status(200).send({
      message:
        "Apartment tickets fetched successfully",
      data: tickets
    });
  } catch (error) {
    console.log(
      "GET APARTMENT TICKETS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch apartment tickets at this time"
    });
  }
};

const getApartmentTicketById = async (
  req,
  res
) => {
  const { id } = req.user;
  const { ticketId } = req.params;

  try {
    const ticket =
      await ApartmentTicketModel.findOne({
        _id: ticketId,
        user: id
      })
        .populate(
          "apartment",
          "title description location apartmentType images amenities pricePerNight dayUsePrice"
        )
        .populate({
          path: "booking",
          select:
            "stayType checkInDate checkOutDate expectedCheckInTime numberOfUnits numberOfNights totalAmount bookingReference bookingStatus paymentStatus stayStatus checkedInAt checkedOutAt"
        });

    if (!ticket) {
      return res.status(404).send({
        message:
          "Apartment ticket not found"
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
        "Cannot fetch apartment ticket at this time"
    });
  }
};

module.exports = {
  getMyApartmentTickets,
  getApartmentTicketById
};