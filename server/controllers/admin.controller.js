const UserModel = require("../models/user.model");
const EventModel = require("../models/event.model");
const BookingModel = require("../models/booking.model");
const TicketModel = require("../models/ticket.model");
const PaymentModel = require("../models/payment.model");

const ApartmentModel = require(
  "../models/apartment.model"
);
const ApartmentBookingModel = require(
  "../models/apartmentBooking.model"
);
const ApartmentPaymentModel = require(
  "../models/apartmentPayment.model"
);

const FoodModel = require("../models/food.model");
const FoodOrderModel = require(
  "../models/foodOrder.model"
);
const FoodPaymentModel = require(
  "../models/foodPayment.model"
);


// ==========================================
// ADMIN DASHBOARD
// ==========================================

const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalOrganizers,
      totalFoodVendors,
      pendingOrganizers,
      pendingFoodVendors,
      totalEvents,
      totalEventBookings,
      totalTickets,
      totalApartments,
      totalApartmentBookings,
      totalFoods,
      totalFoodOrders
    ] = await Promise.all([
      UserModel.countDocuments({
        role: "user"
      }),

      UserModel.countDocuments({
        role: "organizer"
      }),

      UserModel.countDocuments({
        role: "food_vendor"
      }),

      UserModel.countDocuments({
        role: "organizer",
        approvalStatus: "pending"
      }),

      UserModel.countDocuments({
        role: "food_vendor",
        approvalStatus: "pending"
      }),

      EventModel.countDocuments(),

      BookingModel.countDocuments(),

      TicketModel.countDocuments(),

      ApartmentModel.countDocuments(),

      ApartmentBookingModel.countDocuments(),

      FoodModel.countDocuments(),

      FoodOrderModel.countDocuments()
    ]);

    // --------------------------------------
    // EVENT REVENUE
    // --------------------------------------

    const eventRevenueResult =
      await PaymentModel.aggregate([
        {
          $match: {
            status: "paid"
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount"
            }
          }
        }
      ]);

    // --------------------------------------
    // APARTMENT REVENUE
    // --------------------------------------

    const apartmentRevenueResult =
      await ApartmentPaymentModel.aggregate([
        {
          $match: {
            status: "paid"
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount"
            }
          }
        }
      ]);

    // --------------------------------------
    // FOOD REVENUE
    // --------------------------------------

    const foodRevenueResult =
      await FoodPaymentModel.aggregate([
        {
          $match: {
            status: "paid"
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount"
            }
          }
        }
      ]);

    const eventRevenue =
      eventRevenueResult[0]?.total || 0;

    const apartmentRevenue =
      apartmentRevenueResult[0]?.total || 0;

    const foodRevenue =
      foodRevenueResult[0]?.total || 0;

    const totalRevenue =
      eventRevenue +
      apartmentRevenue +
      foodRevenue;

    return res.status(200).send({
      message:
        "Admin dashboard fetched successfully",

      data: {
        users: {
          totalUsers,
          totalOrganizers,
          totalFoodVendors
        },

        pendingApprovals: {
          organizers: pendingOrganizers,
          foodVendors: pendingFoodVendors,
          total:
            pendingOrganizers +
            pendingFoodVendors
        },

        events: {
          totalEvents,
          totalBookings: totalEventBookings,
          totalTickets
        },

        apartments: {
          totalApartments,
          totalBookings:
            totalApartmentBookings
        },

        food: {
          totalFoods,
          totalOrders: totalFoodOrders
        },

        revenue: {
          events: eventRevenue,
          apartments: apartmentRevenue,
          food: foodRevenue,
          total: totalRevenue
        }
      }
    });

  } catch (error) {
    console.log(
      "ADMIN DASHBOARD ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch admin dashboard at this time"
    });
  }
};


// ==========================================
// GET ALL USERS / PROVIDERS
// ==========================================

const getAllUsersAdmin = async (req, res) => {
  try {
    const {
      role,
      approvalStatus
    } = req.query;

    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (approvalStatus) {
      filter.approvalStatus =
        approvalStatus;
    }

    const users = await UserModel
      .find(filter)
      .select(
        "-password -refreshTokenHash -resetPasswordToken -resetPasswordExpires"
      )
      .sort({
        createdAt: -1
      });

    return res.status(200).send({
      message:
        "Users fetched successfully",
      count: users.length,
      data: users
    });

  } catch (error) {
    console.log(
      "ADMIN GET USERS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch users at this time"
    });
  }
};


// ==========================================
// GET ONE USER
// ==========================================

const getUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await UserModel
      .findById(userId)
      .select(
        "-password -refreshTokenHash -resetPasswordToken -resetPasswordExpires"
      );

    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    return res.status(200).send({
      message:
        "User fetched successfully",
      data: user
    });

  } catch (error) {
    console.log(
      "ADMIN GET USER ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch user at this time"
    });
  }
};


// ==========================================
// GET PENDING PROVIDERS
// ==========================================

const getPendingProviders = async (
  req,
  res
) => {
  try {
    const providers =
      await UserModel
        .find({
          role: {
            $in: [
              "organizer",
              "food_vendor"
            ]
          },

          approvalStatus: "pending"
        })
        .select(
          "-password -refreshTokenHash -resetPasswordToken -resetPasswordExpires"
        )
        .sort({
          createdAt: -1
        });

    return res.status(200).send({
      message:
        "Pending providers fetched successfully",
      count: providers.length,
      data: providers
    });

  } catch (error) {
    console.log(
      "GET PENDING PROVIDERS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch pending providers"
    });
  }
};


// ==========================================
// APPROVE PROVIDER
// ==========================================

const approveProvider = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    const provider =
      await UserModel.findById(userId);

    if (!provider) {
      return res.status(404).send({
        message: "Provider not found"
      });
    }

    if (
      provider.role !== "organizer" &&
      provider.role !== "food_vendor"
    ) {
      return res.status(400).send({
        message:
          "Only organizers and food vendors require approval"
      });
    }

    if (
      provider.approvalStatus ===
      "approved"
    ) {
      return res.status(400).send({
        message:
          "Provider is already approved"
      });
    }

    provider.approvalStatus =
      "approved";

    await provider.save();

    return res.status(200).send({
      message:
        "Provider approved successfully",

      data: {
        _id: provider._id,
        firstname: provider.firstname,
        lastname: provider.lastname,
        email: provider.email,
        role: provider.role,
        businessName:
          provider.businessName,
        approvalStatus:
          provider.approvalStatus
      }
    });

  } catch (error) {
    console.log(
      "APPROVE PROVIDER ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot approve provider at this time"
    });
  }
};


// ==========================================
// REJECT PROVIDER
// ==========================================

const rejectProvider = async (
  req,
  res
) => {
  try {
    const { userId } = req.params;

    const provider =
      await UserModel.findById(userId);

    if (!provider) {
      return res.status(404).send({
        message: "Provider not found"
      });
    }

    if (
      provider.role !== "organizer" &&
      provider.role !== "food_vendor"
    ) {
      return res.status(400).send({
        message:
          "Only organizers and food vendors require approval"
      });
    }

    provider.approvalStatus =
      "rejected";

    await provider.save();

    return res.status(200).send({
      message:
        "Provider rejected successfully",

      data: {
        _id: provider._id,
        firstname: provider.firstname,
        lastname: provider.lastname,
        email: provider.email,
        role: provider.role,
        businessName:
          provider.businessName,
        approvalStatus:
          provider.approvalStatus
      }
    });

  } catch (error) {
    console.log(
      "REJECT PROVIDER ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot reject provider at this time"
    });
  }
};


// ==========================================
// GET ALL EVENTS
// ==========================================

const getAllEventsAdmin = async (
  req,
  res
) => {
  try {
    const events =
      await EventModel
        .find()
        .populate(
          "createdBy",
          "firstname lastname email businessName role approvalStatus"
        )
        .sort({
          createdAt: -1
        });

    return res.status(200).send({
      message:
        "Events fetched successfully",
      count: events.length,
      data: events
    });

  } catch (error) {
    console.log(
      "ADMIN GET EVENTS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch events at this time"
    });
  }
};


// ==========================================
// GET ONE EVENT
// ==========================================

const getEventByAdmin = async (
  req,
  res
) => {
  try {
    const { eventId } = req.params;

    const event =
      await EventModel
        .findById(eventId)
        .populate(
          "createdBy",
          "firstname lastname email businessName role approvalStatus"
        );

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    const bookings =
      await BookingModel.countDocuments({
        event: eventId
      });

    const tickets =
      await TicketModel.countDocuments({
        event: eventId
      });

    return res.status(200).send({
      message:
        "Event fetched successfully",

      data: {
        event,
        statistics: {
          bookings,
          tickets
        }
      }
    });

  } catch (error) {
    console.log(
      "ADMIN GET EVENT ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch event at this time"
    });
  }
};


// ==========================================
// GET ALL EVENT BOOKINGS
// ==========================================

const getAllEventBookingsAdmin = async (
  req,
  res
) => {
  try {
    const bookings =
      await BookingModel
        .find()
        .populate(
          "user",
          "firstname lastname email"
        )
        .populate(
          "event",
          "title location date price createdBy"
        )
        .sort({
          createdAt: -1
        });

    return res.status(200).send({
      message:
        "Event bookings fetched successfully",
      count: bookings.length,
      data: bookings
    });

  } catch (error) {
    console.log(
      "ADMIN GET EVENT BOOKINGS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch event bookings"
    });
  }
};


// ==========================================
// GET ALL EVENT PAYMENTS
// ==========================================

const getAllEventPaymentsAdmin = async (
  req,
  res
) => {
  try {
    const payments =
      await PaymentModel
        .find()
        .populate(
          "user",
          "firstname lastname email"
        )
        .populate("booking")
        .sort({
          createdAt: -1
        });

    return res.status(200).send({
      message:
        "Event payments fetched successfully",
      count: payments.length,
      data: payments
    });

  } catch (error) {
    console.log(
      "ADMIN GET EVENT PAYMENTS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch event payments"
    });
  }
};


// ==========================================
// GET ALL APARTMENTS
// ==========================================

const getAllApartmentsAdmin = async (
  req,
  res
) => {
  try {
    const apartments =
      await ApartmentModel
        .find()
        .populate(
          "createdBy",
          "firstname lastname email businessName role"
        )
        .sort({
          createdAt: -1
        });

    return res.status(200).send({
      message:
        "Apartments fetched successfully",
      count: apartments.length,
      data: apartments
    });

  } catch (error) {
    console.log(
      "ADMIN GET APARTMENTS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch apartments"
    });
  }
};


// ==========================================
// GET ONE APARTMENT
// ==========================================

const getApartmentByAdmin = async (
  req,
  res
) => {
  try {
    const { apartmentId } = req.params;

    const apartment =
      await ApartmentModel
        .findById(apartmentId)
        .populate(
          "createdBy",
          "firstname lastname email businessName role"
        );

    if (!apartment) {
      return res.status(404).send({
        message: "Apartment not found"
      });
    }

    const bookings =
      await ApartmentBookingModel
        .countDocuments({
          apartment: apartmentId
        });

    return res.status(200).send({
      message:
        "Apartment fetched successfully",

      data: {
        apartment,
        totalBookings: bookings
      }
    });

  } catch (error) {
    console.log(
      "ADMIN GET APARTMENT ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch apartment"
    });
  }
};


// ==========================================
// GET ALL APARTMENT BOOKINGS
// ==========================================

const getAllApartmentBookingsAdmin =
  async (req, res) => {
    try {
      const bookings =
        await ApartmentBookingModel
          .find()
          .populate(
            "user",
            "firstname lastname email"
          )
          .populate(
            "apartment",
            "title location apartmentType pricePerNight dayUsePrice createdBy"
          )
          .sort({
            createdAt: -1
          });

      return res.status(200).send({
        message:
          "Apartment bookings fetched successfully",
        count: bookings.length,
        data: bookings
      });

    } catch (error) {
      console.log(
        "ADMIN GET APARTMENT BOOKINGS ERROR:",
        error
      );

      return res.status(500).send({
        message:
          "Cannot fetch apartment bookings"
      });
    }
  };


// ==========================================
// GET ALL APARTMENT PAYMENTS
// ==========================================

const getAllApartmentPaymentsAdmin =
  async (req, res) => {
    try {
      const payments =
        await ApartmentPaymentModel
          .find()
          .populate(
            "user",
            "firstname lastname email"
          )
          .populate("booking")
          .sort({
            createdAt: -1
          });

      return res.status(200).send({
        message:
          "Apartment payments fetched successfully",
        count: payments.length,
        data: payments
      });

    } catch (error) {
      console.log(
        "ADMIN GET APARTMENT PAYMENTS ERROR:",
        error
      );

      return res.status(500).send({
        message:
          "Cannot fetch apartment payments"
      });
    }
  };


// ==========================================
// GET ALL FOODS
// ==========================================

const getAllFoodsAdmin = async (
  req,
  res
) => {
  try {
    const foods =
      await FoodModel
        .find()
        .populate(
          "createdBy",
          "firstname lastname email businessName role"
        )
        .sort({
          createdAt: -1
        });

    return res.status(200).send({
      message:
        "Foods fetched successfully",
      count: foods.length,
      data: foods
    });

  } catch (error) {
    console.log(
      "ADMIN GET FOODS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch foods"
    });
  }
};


// ==========================================
// GET ONE FOOD
// ==========================================

const getFoodByAdmin = async (
  req,
  res
) => {
  try {
    const { foodId } = req.params;

    const food =
      await FoodModel
        .findById(foodId)
        .populate(
          "createdBy",
          "firstname lastname email businessName role"
        );

    if (!food) {
      return res.status(404).send({
        message: "Food not found"
      });
    }

    return res.status(200).send({
      message:
        "Food fetched successfully",
      data: food
    });

  } catch (error) {
    console.log(
      "ADMIN GET FOOD ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch food"
    });
  }
};


// ==========================================
// GET ALL FOOD ORDERS
// ==========================================

const getAllFoodOrdersAdmin = async (
  req,
  res
) => {
  try {
    const orders =
      await FoodOrderModel
        .find()
        .populate(
          "user",
          "firstname lastname email"
        )
        .populate(
          "vendor",
          "firstname lastname email businessName"
        )
        .sort({
          createdAt: -1
        });

    return res.status(200).send({
      message:
        "Food orders fetched successfully",
      count: orders.length,
      data: orders
    });

  } catch (error) {
    console.log(
      "ADMIN GET FOOD ORDERS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch food orders"
    });
  }
};


// ==========================================
// GET ALL FOOD PAYMENTS
// ==========================================

const getAllFoodPaymentsAdmin = async (
  req,
  res
) => {
  try {
    const payments =
      await FoodPaymentModel
        .find()
        .populate(
          "user",
          "firstname lastname email"
        )
        .populate("order")
        .sort({
          createdAt: -1
        });

    return res.status(200).send({
      message:
        "Food payments fetched successfully",
      count: payments.length,
      data: payments
    });

  } catch (error) {
    console.log(
      "ADMIN GET FOOD PAYMENTS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch food payments"
    });
  }
};

// ==========================================
// SUSPEND USER
// ==========================================

const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from suspending their own account
    if (userId === req.user.id) {
      return res.status(400).send({
        message: "You cannot suspend your own admin account"
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    if (user.role === "admin") {
      return res.status(403).send({
        message: "Another admin account cannot be suspended here"
      });
    }

    if (user.accountStatus === "suspended") {
      return res.status(400).send({
        message: "User is already suspended"
      });
    }

    user.accountStatus = "suspended";

    // Invalidate existing refresh token
    user.refreshTokenHash = null;

    await user.save();

    return res.status(200).send({
      message: "User suspended successfully",
      data: {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus
      }
    });

  } catch (error) {
    console.log("SUSPEND USER ERROR:", error);

    return res.status(500).send({
      message: "Cannot suspend user at this time"
    });
  }
};


// ==========================================
// REACTIVATE USER
// ==========================================

const reactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    if (user.accountStatus === "active") {
      return res.status(400).send({
        message: "User account is already active"
      });
    }

    user.accountStatus = "active";

    await user.save();

    return res.status(200).send({
      message: "User reactivated successfully",
      data: {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus
      }
    });

  } catch (error) {
    console.log("REACTIVATE USER ERROR:", error);

    return res.status(500).send({
      message: "Cannot reactivate user at this time"
    });
  }
};


// ==========================================
// DISABLE EVENT
// ==========================================

const disableEventAdmin = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.isAvailable === false) {
      return res.status(400).send({
        message: "Event is already disabled"
      });
    }

    event.isAvailable = false;

    await event.save();

    return res.status(200).send({
      message: "Event disabled successfully",
      data: event
    });

  } catch (error) {
    console.log("DISABLE EVENT ERROR:", error);

    return res.status(500).send({
      message: "Cannot disable event at this time"
    });
  }
};


// ==========================================
// ENABLE EVENT
// ==========================================

const enableEventAdmin = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.isAvailable === true) {
      return res.status(400).send({
        message: "Event is already enabled"
      });
    }

    event.isAvailable = true;

    await event.save();

    return res.status(200).send({
      message: "Event enabled successfully",
      data: event
    });

  } catch (error) {
    console.log("ENABLE EVENT ERROR:", error);

    return res.status(500).send({
      message: "Cannot enable event at this time"
    });
  }
};


// ==========================================
// DISABLE APARTMENT
// ==========================================

const disableApartmentAdmin = async (req, res) => {
  try {
    const { apartmentId } = req.params;

    const apartment =
      await ApartmentModel.findById(apartmentId);

    if (!apartment) {
      return res.status(404).send({
        message: "Apartment not found"
      });
    }

    if (apartment.isAvailable === false) {
      return res.status(400).send({
        message: "Apartment is already disabled"
      });
    }

    apartment.isAvailable = false;

    await apartment.save();

    return res.status(200).send({
      message: "Apartment disabled successfully",
      data: apartment
    });

  } catch (error) {
    console.log("DISABLE APARTMENT ERROR:", error);

    return res.status(500).send({
      message: "Cannot disable apartment at this time"
    });
  }
};


// ==========================================
// ENABLE APARTMENT
// ==========================================

const enableApartmentAdmin = async (req, res) => {
  try {
    const { apartmentId } = req.params;

    const apartment =
      await ApartmentModel.findById(apartmentId);

    if (!apartment) {
      return res.status(404).send({
        message: "Apartment not found"
      });
    }

    if (apartment.isAvailable === true) {
      return res.status(400).send({
        message: "Apartment is already enabled"
      });
    }

    apartment.isAvailable = true;

    await apartment.save();

    return res.status(200).send({
      message: "Apartment enabled successfully",
      data: apartment
    });

  } catch (error) {
    console.log("ENABLE APARTMENT ERROR:", error);

    return res.status(500).send({
      message: "Cannot enable apartment at this time"
    });
  }
};


// ==========================================
// DISABLE FOOD
// ==========================================

const disableFoodAdmin = async (req, res) => {
  try {
    const { foodId } = req.params;

    const food = await FoodModel.findById(foodId);

    if (!food) {
      return res.status(404).send({
        message: "Food not found"
      });
    }

    if (food.isAvailable === false) {
      return res.status(400).send({
        message: "Food is already disabled"
      });
    }

    food.isAvailable = false;

    await food.save();

    return res.status(200).send({
      message: "Food disabled successfully",
      data: food
    });

  } catch (error) {
    console.log("DISABLE FOOD ERROR:", error);

    return res.status(500).send({
      message: "Cannot disable food at this time"
    });
  }
};


// ==========================================
// ENABLE FOOD
// ==========================================

const enableFoodAdmin = async (req, res) => {
  try {
    const { foodId } = req.params;

    const food = await FoodModel.findById(foodId);

    if (!food) {
      return res.status(404).send({
        message: "Food not found"
      });
    }

    if (food.isAvailable === true) {
      return res.status(400).send({
        message: "Food is already enabled"
      });
    }

    food.isAvailable = true;

    await food.save();

    return res.status(200).send({
      message: "Food enabled successfully",
      data: food
    });

  } catch (error) {
    console.log("ENABLE FOOD ERROR:", error);

    return res.status(500).send({
      message: "Cannot enable food at this time"
    });
  }
};

const transferEventOrganizer = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { organizerId } = req.body;

    if (!organizerId) {
      return res.status(400).send({
        message: "Organizer ID is required"
      });
    }

    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    const organizer = await UserModel.findById(organizerId);

    if (!organizer) {
      return res.status(404).send({
        message: "Organizer not found"
      });
    }

    if (organizer.role !== "organizer") {
      return res.status(400).send({
        message: "Selected user is not an organizer"
      });
    }

    if (organizer.accountStatus !== "active") {
      return res.status(400).send({
        message: "Organizer account is not active"
      });
    }

    if (organizer.approvalStatus !== "approved") {
      return res.status(400).send({
        message: "Organizer is not approved"
      });
    }

    event.createdBy = organizer._id;

    await event.save();

    const updatedEvent = await EventModel.findById(eventId)
      .populate(
        "createdBy",
        "firstname lastname email role businessName"
      );

    return res.status(200).send({
      message: "Event organizer transferred successfully",
      data: updatedEvent
    });
  } catch (error) {
    console.log("TRANSFER EVENT ERROR:", error);

    return res.status(400).send({
      message: "Cannot transfer event organizer at this time",
      error: error.message
    });
  }
};

const getAllProviders = async (req, res) => {
  try {
    const { approvalStatus, accountStatus, role } = req.query;

    const filter = {
      role: {
        $in: ["organizer", "food_vendor"]
      }
    };

    if (
      role &&
      ["organizer", "food_vendor"].includes(role)
    ) {
      filter.role = role;
    }

    if (approvalStatus) {
      filter.approvalStatus = approvalStatus;
    }

    if (accountStatus) {
      filter.accountStatus = accountStatus;
    }

    const providers = await UserModel
      .find(filter)
      .select(
        "-password -refreshTokenHash -resetPasswordToken -resetPasswordExpires"
      )
      .sort({
        createdAt: -1
      });

    return res.status(200).send({
      message: "Providers fetched successfully",
      count: providers.length,
      data: providers
    });
  } catch (error) {
    console.log(
      "ADMIN GET PROVIDERS ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch providers at this time"
    });
  }
};


const getProviderByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const provider = await UserModel
      .findById(userId)
      .select(
        "-password -refreshTokenHash -resetPasswordToken -resetPasswordExpires"
      );

    if (!provider) {
      return res.status(404).send({
        message: "Provider not found"
      });
    }

    if (
      provider.role !== "organizer" &&
      provider.role !== "food_vendor"
    ) {
      return res.status(400).send({
        message:
          "Selected account is not a provider"
      });
    }

    let totalEvents = 0;
    let totalApartments = 0;
    let totalFoods = 0;

    if (provider.role === "organizer") {
      totalEvents =
        await EventModel.countDocuments({
          createdBy: provider._id
        });

      totalApartments =
        await ApartmentModel.countDocuments({
          createdBy: provider._id
        });
    }

    if (provider.role === "food_vendor") {
      totalFoods =
        await FoodModel.countDocuments({
          createdBy: provider._id
        });
    }

    return res.status(200).send({
      message:
        "Provider fetched successfully",

      data: {
        provider,

        statistics: {
          totalEvents,
          totalApartments,
          totalFoods
        }
      }
    });
  } catch (error) {
    console.log(
      "ADMIN GET PROVIDER ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot fetch provider at this time"
    });
  }
};


const deleteProvider = async (req, res) => {
  try {
    const { userId } = req.params;

    const provider =
      await UserModel.findById(userId);

    if (!provider) {
      return res.status(404).send({
        message: "Provider not found"
      });
    }

    if (
      provider.role !== "organizer" &&
      provider.role !== "food_vendor"
    ) {
      return res.status(400).send({
        message:
          "Only provider accounts can be removed here"
      });
    }

    provider.accountStatus = "suspended";
    provider.refreshTokenHash = null;

    await provider.save();

    return res.status(200).send({
      message:
        "Provider removed from active access successfully",

      data: {
        _id: provider._id,
        firstname: provider.firstname,
        lastname: provider.lastname,
        email: provider.email,
        businessName: provider.businessName,
        role: provider.role,
        approvalStatus:
          provider.approvalStatus,
        accountStatus:
          provider.accountStatus
      }
    });
  } catch (error) {
    console.log(
      "DELETE PROVIDER ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot remove provider at this time"
    });
  }
};

module.exports = {
  getAdminDashboard,

  getAllUsersAdmin,
  getUserByAdmin,

  getPendingProviders,
  getAllProviders,
  getProviderByAdmin,
  approveProvider,
  rejectProvider,
  deleteProvider,

  getAllEventsAdmin,
  getEventByAdmin,
  getAllEventBookingsAdmin,
  getAllEventPaymentsAdmin,

  getAllApartmentsAdmin,
  getApartmentByAdmin,
  getAllApartmentBookingsAdmin,
  getAllApartmentPaymentsAdmin,

  getAllFoodsAdmin,
  getFoodByAdmin,
  getAllFoodOrdersAdmin,
  getAllFoodPaymentsAdmin,

  suspendUser,
  reactivateUser,

  disableEventAdmin,
  enableEventAdmin,

  disableApartmentAdmin,
  enableApartmentAdmin,

  disableFoodAdmin,
  enableFoodAdmin,

  transferEventOrganizer
};