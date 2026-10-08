
const UserModel = require("../models/user.model");
const EventModel = require("../models/event.model");
const ApartmentModel = require("../models/apartment.model");
const FoodModel = require("../models/food.model");
const BookingModel = require("../models/booking.model");
const FoodOrderModel = require("../models/foodOrder.model");
const PaymentModel = require("../models/payment.model");
const ApartmentBookingModel = require("../models/apartmentBooking.model");
const RefundModel = require("../models/refund.model");

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

    const [organizerEvents, organizerApartments] = await Promise.all([
      EventModel.find({ createdBy: organizerId }).select(
        "_id title date location"
      ),
      ApartmentModel.find({ createdBy: organizerId }).select("_id")
    ]);

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
      EventModel.countDocuments({ createdBy: organizerId }),
      EventModel.countDocuments({
        createdBy: organizerId,
        date: { $gte: now }
      }),
      EventModel.countDocuments({
        createdBy: organizerId,
        date: { $lt: now }
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
        quantity: { $gt: 0 }
      }),
      FoodModel.countDocuments({
        createdBy: organizerId,
        quantity: 0
      }),
      BookingModel.countDocuments({
        event: { $in: organizerEventIds }
      }),
      BookingModel.countDocuments({
        event: { $in: organizerEventIds },
        bookingStatus: "confirmed"
      }),
      BookingModel.countDocuments({
        event: { $in: organizerEventIds },
        bookingStatus: "pending"
      }),
      ApartmentBookingModel.countDocuments({
        apartment: { $in: organizerApartmentIds }
      }),
      ApartmentBookingModel.countDocuments({
        apartment: { $in: organizerApartmentIds },
        bookingStatus: "confirmed"
      }),
      ApartmentBookingModel.countDocuments({
        apartment: { $in: organizerApartmentIds },
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
        orderStatus: { $in: ["packing", "ready"] }
      }),
      FoodOrderModel.countDocuments({
        vendor: organizerId,
        orderStatus: "completed"
      }),
      EventModel.find({
        createdBy: organizerId
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "title description location date price totalTickets availableTickets ticketTypes image isAvailable createdAt"
        ),
      ApartmentModel.find({
        createdBy: organizerId
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "title description apartmentType location pricePerNight dayUsePrice totalUnits amenities images isAvailable createdAt"
        ),
      FoodModel.find({
        createdBy: organizerId
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "name description price quantity category image isAvailable createdAt"
        ),
      BookingModel.find({
        event: { $in: organizerEventIds }
      })
        .populate(
          "user",
          "firstname lastname email profilePicture"
        )
        .populate(
          "event",
          "title location date image"
        )
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "user event ticketType ticketPrice ticketSelections quantity totalAmount bookingReference bookingStatus paymentStatus createdAt"
        ),
      ApartmentBookingModel.find({
        apartment: { $in: organizerApartmentIds }
      })
        .populate(
          "user",
          "firstname lastname email profilePicture"
        )
        .populate(
          "apartment",
          "title location apartmentType images"
        )
        .sort({ createdAt: -1 })
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
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "user items totalAmount orderReference pickupCode orderStatus paymentStatus collectedAt createdAt"
        )
    ]);

    const organizerBookings = await BookingModel.find({
      event: { $in: organizerEventIds }
    }).select("_id event user bookingReference totalAmount paymentStatus");

    const organizerBookingIds = organizerBookings.map(
      (booking) => booking._id
    );

    const bookingById = new Map(
      organizerBookings.map((booking) => [
        String(booking._id),
        booking
      ])
    );

    const [
      paidEventPayments,
      recentEventPayments,
      eventRefundsList,
      apartmentRevenueResult,
      foodRevenueResult
    ] = await Promise.all([
      PaymentModel.find({
        booking: { $in: organizerBookingIds },
        status: {
          $in: ["paid", "partially_refunded", "refunded"]
        }
      }).select(
        "booking amount status refundedAmount createdAt"
      ),
      PaymentModel.find({
        booking: { $in: organizerBookingIds }
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select(
          "booking amount status refundedAmount refundStatus paymentReference createdAt"
        ),
      RefundModel.find({
        booking: { $in: organizerBookingIds }
      })
        .sort({ createdAt: -1 })
        .select(
          "booking user tickets amount refundKind refundReference paystackRefundId status reason createdAt updatedAt"
        ),
      ApartmentBookingModel.aggregate([
        {
          $match: {
            apartment: { $in: organizerApartmentIds },
            paymentStatus: "paid"
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" }
          }
        }
      ]),
      FoodOrderModel.aggregate([
        {
          $match: {
            vendor: organizer._id,
            paymentStatus: "paid"
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" }
          }
        }
      ])
    ]);

    const eventGrossRevenue = paidEventPayments.reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

    const eventRefunds = paidEventPayments.reduce(
      (total, payment) =>
        total + Number(payment.refundedAmount || 0),
      0
    );

    const eventNetRevenue = eventGrossRevenue - eventRefunds;

    const apartmentRevenue =
      apartmentRevenueResult[0]?.total || 0;

    const foodRevenue =
      foodRevenueResult[0]?.total || 0;

    const totalRevenue =
      eventNetRevenue + apartmentRevenue + foodRevenue;

    const totalBookingsAndOrders =
      totalEventBookings +
      totalApartmentBookings +
      totalFoodOrders;

    const pendingBookingsAndOrders =
      pendingEventBookings +
      pendingApartmentBookings +
      pendingFoodOrders;

    const revenueByEventMap = new Map(
      organizerEvents.map((event) => [
        String(event._id),
        {
          eventId: event._id,
          title: event.title,
          location: event.location,
          date: event.date,
          totalBookings: 0,
          paidBookings: 0,
          grossRevenue: 0,
          refundedAmount: 0,
          netRevenue: 0
        }
      ])
    );

    for (const booking of organizerBookings) {
      const item = revenueByEventMap.get(String(booking.event));

      if (!item) continue;

      item.totalBookings += 1;

      if (
        ["paid", "partially_refunded"].includes(
          booking.paymentStatus
        )
      ) {
        item.paidBookings += 1;
      }
    }

    for (const payment of paidEventPayments) {
      const booking = bookingById.get(String(payment.booking));

      if (!booking) continue;

      const item = revenueByEventMap.get(String(booking.event));

      if (!item) continue;

      item.grossRevenue += Number(payment.amount || 0);
      item.refundedAmount += Number(payment.refundedAmount || 0);
      item.netRevenue =
        item.grossRevenue - item.refundedAmount;
    }

    const revenueByEvent = Array.from(
      revenueByEventMap.values()
    ).sort((a, b) => b.grossRevenue - a.grossRevenue);

    const refundStats = {
      totalRefundRequests: eventRefundsList.length,
      initiating: 0,
      pending: 0,
      processing: 0,
      processed: 0,
      failed: 0,
      needsAttention: 0,
      pendingRefundAmount: 0,
      processedRefundAmount: 0,
      failedRefundAmount: 0
    };

    for (const refund of eventRefundsList) {
      const amount = Number(refund.amount || 0);

      if (refund.status === "initiating") {
        refundStats.initiating += 1;
        refundStats.pendingRefundAmount += amount;
      }

      if (refund.status === "pending") {
        refundStats.pending += 1;
        refundStats.pendingRefundAmount += amount;
      }

      if (refund.status === "processing") {
        refundStats.processing += 1;
        refundStats.pendingRefundAmount += amount;
      }

      if (refund.status === "processed") {
        refundStats.processed += 1;
        refundStats.processedRefundAmount += amount;
      }

      if (refund.status === "failed") {
        refundStats.failed += 1;
        refundStats.failedRefundAmount += amount;
      }

      if (refund.status === "needs-attention") {
        refundStats.needsAttention += 1;
        refundStats.pendingRefundAmount += amount;
      }
    }

    const recentRefunds = eventRefundsList
      .slice(0, 10)
      .map((refund) => {
        const booking = bookingById.get(
          String(refund.booking)
        );

        const event = organizerEvents.find(
          (item) =>
            String(item._id) === String(booking?.event)
        );

        return {
          _id: refund._id,
          refundReference: refund.refundReference,
          bookingReference: booking?.bookingReference || null,
          eventId: event?._id || null,
          eventTitle: event?.title || "Event",
          user: refund.user,
          amount: refund.amount,
          refundKind: refund.refundKind,
          ticketsCount: refund.tickets?.length || 0,
          status: refund.status,
          reason: refund.reason,
          createdAt: refund.createdAt,
          updatedAt: refund.updatedAt
        };
      });

    const formattedRecentPayments = recentEventPayments.map(
      (payment) => {
        const booking = bookingById.get(
          String(payment.booking)
        );

        const event = organizerEvents.find(
          (item) =>
            String(item._id) === String(booking?.event)
        );

        return {
          _id: payment._id,
          eventId: event?._id || null,
          eventTitle: event?.title || "Event",
          bookingReference: booking?.bookingReference || null,
          paymentReference: payment.paymentReference,
          amount: payment.amount,
          refundedAmount: payment.refundedAmount || 0,
          status: payment.status,
          refundStatus: payment.refundStatus,
          createdAt: payment.createdAt
        };
      }
    );

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
        revenueByEvent,
        refundStats,
        recentRefunds,
        recentEventPayments: formattedRecentPayments,
        recentEvents,
        recentApartments,
        recentFoodItems,
        recentEventBookings,
        recentApartmentBookings,
        recentFoodOrders
      }
    });
  } catch (error) {
    console.error("ORGANIZER DASHBOARD ERROR:", error);

    return res.status(500).send({
      message: "Cannot fetch organizer dashboard at this time"
    });
  }
};

module.exports = {
  getOrganizerDashboard
};
