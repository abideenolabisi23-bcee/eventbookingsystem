const UserModel = require("../models/user.model");
const EventModel = require("../models/event.model");
const ApartmentModel = require("../models/apartment.model");
const FoodModel = require("../models/food.model");
const BookingModel = require("../models/booking.model");
const FoodOrderModel = require("../models/foodOrder.model");
const PaymentModel = require("../models/payment.model");
const ApartmentBookingModel = require("../models/apartmentBooking.model");

const getOrganizerDashboard = async (req, res) => {
  try {
    const organizerId = req.user.id;
    const now = new Date();

    const organizer = await UserModel.findById(organizerId).select(
      "firstname lastname email businessName phone profilePicture role approvalStatus accountStatus"
    );

    if (!organizer) {
      return res.status(404).send({
        message: "Organizer not found"
      });
    }

    const organizerEvents = await EventModel.find({
      createdBy: organizerId
    }).select("_id");

    const organizerApartments = await ApartmentModel.find({
      createdBy: organizerId
    }).select("_id");

    const organizerEventIds = organizerEvents.map((event) => event._id);

    const organizerApartmentIds = organizerApartments.map(
      (apartment) => apartment._id
    );

    const [
      totalEvents,
      upcomingEvents,
      pastEvents,
      availableEvents,

      totalApartments,
      availableApartments,
      unavailableApartments,

      totalFoodItems,
      availableFoodItems,
      soldOutFoodItems,

      totalEventBookings,
      confirmedEventBookings,
      pendingEventBookings,

      totalApartmentBookings,
      confirmedApartmentBookings,
      pendingApartmentBookings,

      totalFoodOrders,
      pendingFoodOrders,
      activeFoodOrders,
      completedFoodOrders,

      recentEvents,
      recentApartments,
      recentFoodItems,
      recentEventBookings,
      recentApartmentBookings,
      recentFoodOrders
    ] = await Promise.all([
      EventModel.countDocuments({
        createdBy: organizerId
      }),

      EventModel.countDocuments({
        createdBy: organizerId,
        date: {
          $gte: now
        }
      }),

      EventModel.countDocuments({
        createdBy: organizerId,
        date: {
          $lt: now
        }
      }),

      EventModel.countDocuments({
        createdBy: organizerId,
        isAvailable: true
      }),

      ApartmentModel.countDocuments({
        createdBy: organizerId
      }),

      ApartmentModel.countDocuments({
        createdBy: organizerId,
        isAvailable: true
      }),

      ApartmentModel.countDocuments({
        createdBy: organizerId,
        isAvailable: false
      }),

      FoodModel.countDocuments({
        createdBy: organizerId
      }),

      FoodModel.countDocuments({
        createdBy: organizerId,
        isAvailable: true,
        quantity: {
          $gt: 0
        }
      }),

      FoodModel.countDocuments({
        createdBy: organizerId,
        quantity: 0
      }),

      BookingModel.countDocuments({
        event: {
          $in: organizerEventIds
        }
      }),

      BookingModel.countDocuments({
        event: {
          $in: organizerEventIds
        },
        bookingStatus: "confirmed"
      }),

      BookingModel.countDocuments({
        event: {
          $in: organizerEventIds
        },
        bookingStatus: "pending"
      }),

      ApartmentBookingModel.countDocuments({
        apartment: {
          $in: organizerApartmentIds
        }
      }),

      ApartmentBookingModel.countDocuments({
        apartment: {
          $in: organizerApartmentIds
        },
        bookingStatus: "confirmed"
      }),

      ApartmentBookingModel.countDocuments({
        apartment: {
          $in: organizerApartmentIds
        },
        bookingStatus: "pending"
      }),

      FoodOrderModel.countDocuments({
        vendor: organizerId
      }),

      FoodOrderModel.countDocuments({
        vendor: organizerId,
        orderStatus: "pending"
      }),

      FoodOrderModel.countDocuments({
        vendor: organizerId,
        orderStatus: {
          $in: ["packing", "ready"]
        }
      }),

      FoodOrderModel.countDocuments({
        vendor: organizerId,
        orderStatus: "completed"
      }),

      EventModel.find({
        createdBy: organizerId
      })
        .sort({
          createdAt: -1
        })
        .limit(5)
        .select(
          "title description location date price totalTickets availableTickets ticketTypes image isAvailable createdAt"
        ),

      ApartmentModel.find({
        createdBy: organizerId
      })
        .sort({
          createdAt: -1
        })
        .limit(5)
        .select(
          "title description apartmentType location pricePerNight dayUsePrice totalUnits amenities images isAvailable createdAt"
        ),

      FoodModel.find({
        createdBy: organizerId
      })
        .sort({
          createdAt: -1
        })
        .limit(5)
        .select(
          "name description price quantity category image isAvailable createdAt"
        ),

      BookingModel.find({
        event: {
          $in: organizerEventIds
        }
      })
        .populate(
          "user",
          "firstname lastname email profilePicture"
        )
        .populate(
          "event",
          "title location date image"
        )
        .sort({
          createdAt: -1
        })
        .limit(5)
        .select(
          "user event ticketType ticketPrice quantity totalAmount bookingReference bookingStatus paymentStatus createdAt"
        ),

      ApartmentBookingModel.find({
        apartment: {
          $in: organizerApartmentIds
        }
      })
        .populate(
          "user",
          "firstname lastname email profilePicture"
        )
        .populate(
          "apartment",
          "title location apartmentType images"
        )
        .sort({
          createdAt: -1
        })
        .limit(5)
        .select(
          "user apartment stayType checkInDate checkOutDate expectedCheckInTime numberOfUnits numberOfNights totalAmount bookingReference bookingStatus paymentStatus stayStatus createdAt"
        ),

      FoodOrderModel.find({
        vendor: organizerId
      })
        .populate(
          "user",
          "firstname lastname email profilePicture"
        )
        .sort({
          createdAt: -1
        })
        .limit(5)
        .select(
          "user items totalAmount orderReference pickupCode orderStatus paymentStatus collectedAt createdAt"
        )
    ]);

    const paidEventPayments = await PaymentModel.find({
      booking: {
        $in: await BookingModel.find({
          event: {
            $in: organizerEventIds
          }
        }).distinct("_id")
      },
      status: {
        $in: [
          "paid",
          "partially_refunded",
          "refunded"
        ]
      }
    }).select(
      "amount status refundedAmount"
    );

    const eventGrossRevenue = paidEventPayments.reduce(
      (total, payment) => {
        return total + Number(payment.amount || 0);
      },
      0
    );

    const eventRefunds = paidEventPayments.reduce(
      (total, payment) => {
        return total + Number(payment.refundedAmount || 0);
      },
      0
    );

    const eventNetRevenue =
      eventGrossRevenue - eventRefunds;

    const apartmentRevenueResult =
      await ApartmentBookingModel.aggregate([
        {
          $match: {
            apartment: {
              $in: organizerApartmentIds
            },
            paymentStatus: "paid"
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount"
            }
          }
        }
      ]);

    const apartmentRevenue =
      apartmentRevenueResult[0]?.total || 0;

    const foodRevenueResult =
      await FoodOrderModel.aggregate([
        {
          $match: {
            vendor: organizer._id,
            paymentStatus: "paid"
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalAmount"
            }
          }
        }
      ]);

    const foodRevenue =
      foodRevenueResult[0]?.total || 0;

    const totalRevenue =
      eventNetRevenue +
      apartmentRevenue +
      foodRevenue;

    const totalBookingsAndOrders =
      totalEventBookings +
      totalApartmentBookings +
      totalFoodOrders;

    const pendingBookingsAndOrders =
      pendingEventBookings +
      pendingApartmentBookings +
      pendingFoodOrders;

    return res.status(200).send({
      message: "Organizer dashboard fetched successfully",
      data: {
        organizer,

        stats: {
          totalEvents,
          upcomingEvents,
          pastEvents,
          availableEvents,

          totalApartments,
          availableApartments,
          unavailableApartments,

          totalFoodItems,
          availableFoodItems,
          soldOutFoodItems,

          totalEventBookings,
          confirmedEventBookings,
          pendingEventBookings,

          totalApartmentBookings,
          confirmedApartmentBookings,
          pendingApartmentBookings,

          totalFoodOrders,
          pendingFoodOrders,
          activeFoodOrders,
          completedFoodOrders,

          totalBookingsAndOrders,
          pendingBookingsAndOrders
        },

        revenue: {
          eventGrossRevenue,
          eventRefunds,
          eventNetRevenue,
          apartmentRevenue,
          foodRevenue,
          totalRevenue
        },

        recentEvents,
        recentApartments,
        recentFoodItems,
        recentEventBookings,
        recentApartmentBookings,
        recentFoodOrders
      }
    });
  } catch (error) {
    console.log(
      "ORGANIZER DASHBOARD ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch organizer dashboard at this time"
    });
  }
};

module.exports = {
  getOrganizerDashboard
};