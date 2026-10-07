const ApartmentModel = require("../models/apartment.model");
const cloudinary = require("../config/cloudinary");
const ApartmentBookingModel =
  require("../models/apartmentBooking.model");
const {
  getApartmentAvailability
} = require("../utils/apartmentAvailability");

const {
  getBookingWindow
} = require("../utils/apartmentAvailability");


const uploadApartmentImage = (fileBuffer, imageType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `vibely/apartments/${imageType}`
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result.secure_url);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

const createApartment = async (req, res) => {
  try {
    const {
      title,
      description,
      apartmentType,
      location,
      pricePerNight,
      dayUsePrice,
      totalUnits
    } = req.body;

    let amenities = req.body.amenities || [];

    if (typeof amenities === "string") {
      try {
        amenities = JSON.parse(amenities);
      } catch {
        amenities = amenities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    if (
      !title ||
      !description ||
      !apartmentType ||
      !location ||
      pricePerNight === undefined ||
      dayUsePrice === undefined ||
      totalUnits === undefined
    ) {
      return res.status(400).send({
        message: "Please provide all required apartment information"
      });
    }

    if (
      !["budget", "standard", "luxury"].includes(apartmentType)
    ) {
      return res.status(400).send({
        message: "Apartment type must be budget, standard or luxury"
      });
    }

    const parsedPricePerNight = Number(pricePerNight);
    const parsedDayUsePrice = Number(dayUsePrice);
    const parsedTotalUnits = Number(totalUnits);

    if (
      !Number.isFinite(parsedPricePerNight) ||
      parsedPricePerNight < 0
    ) {
      return res.status(400).send({
        message: "Price per night must be a valid amount"
      });
    }

    if (
      !Number.isFinite(parsedDayUsePrice) ||
      parsedDayUsePrice < 0
    ) {
      return res.status(400).send({
        message: "Day-use price must be a valid amount"
      });
    }

    if (
      !Number.isInteger(parsedTotalUnits) ||
      parsedTotalUnits < 1
    ) {
      return res.status(400).send({
        message: "Total rooms must be a whole number of at least 1"
      });
    }

    const imageTypes = [
  "exterior",
  "livingRoom",
  "bedroom",
  "kitchen",
  "bathroom",
  "balcony",
  "extraView"
];

    const images = {};

    for (const imageType of imageTypes) {
      if (
        req.files &&
        req.files[imageType] &&
        req.files[imageType][0]
      ) {
        images[imageType] = await uploadApartmentImage(
          req.files[imageType][0].buffer,
          imageType
        );
      }
    }

    const apartment = await ApartmentModel.create({
      title,
      description,
      apartmentType,
      location,
      pricePerNight: parsedPricePerNight,
      dayUsePrice: parsedDayUsePrice,
      totalUnits: parsedTotalUnits,
      amenities,
      images,
      createdBy: req.user.id
    });

    return res.status(201).send({
      message: "Apartment created successfully",
      data: apartment
    });

  } catch (error) {
    console.log("CREATE APARTMENT ERROR:", error);

    return res.status(400).send({
      message: "Cannot create apartment at this time",
      error: error.message
    });
  }
};

const getApartments = async (req, res) => {
  try {
    const apartments = await ApartmentModel.find({
      isAvailable: true
    }).sort({ pricePerNight: 1 });

    return res.status(200).send({
      message: "Apartments fetched successfully",
      data: apartments
    });

  } catch (error) {
    console.log("GET APARTMENTS ERROR:", error);

    return res.status(500).send({
      message: "Cannot fetch apartments at this time"
    });
  }
};

const getMyApartments = async (req, res) => {
  try {
    const organizerId = req.user.id;

    const apartments = await ApartmentModel.find({
      createdBy: organizerId
    }).sort({
      createdAt: -1
    });

    return res.status(200).send({
      message: "Organizer apartments fetched successfully",
      count: apartments.length,
      data: apartments
    });

  } catch (error) {
    console.log("GET MY APARTMENTS ERROR:", error);

    return res.status(500).send({
      message: "Cannot fetch your apartments at this time",
      error: error.message
    });
  }
};

const getApartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const apartment = await ApartmentModel.findById(id);

    if (!apartment) {
      return res.status(404).send({
        message: "Apartment not found"
      });
    }

    if (!apartment.isAvailable) {
      return res.status(404).send({
        message: "Apartment is currently unavailable"
      });
    }

    return res.status(200).send({
      message: "Apartment fetched successfully",
      data: apartment
    });

  } catch (error) {
    console.log("GET APARTMENT ERROR:", error);

    return res.status(400).send({
      message: "Cannot fetch apartment at this time"
    });
  }
};

const updateApartment = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const organizerId = req.user.id;


    const apartment =
      await ApartmentModel.findById(
        apartmentId
      );


    if (!apartment) {
      return res.status(404).send({
        message: "Apartment not found"
      });
    }


    // ==========================================
    // CHECK OWNERSHIP
    // ==========================================

    if (
      apartment.createdBy.toString() !==
      organizerId.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to update this apartment"
      });
    }


    // ==========================================
    // GET UPDATE DATA
    // ==========================================

    const {
  title,
  description,
  apartmentType,
  location,
  pricePerNight,
  dayUsePrice,
  totalUnits,
  amenities
} = req.body;


    if (title !== undefined) {
      apartment.title = title;
    }


    if (description !== undefined) {
      apartment.description =
        description;
    }


    if (apartmentType !== undefined) {
      apartment.apartmentType =
        apartmentType;
    }


    if (location !== undefined) {
      apartment.location = location;
    }


    if (pricePerNight !== undefined) {

      const newPricePerNight =
        Number(pricePerNight);


      if (
        !Number.isFinite(
          newPricePerNight
        ) ||
        newPricePerNight < 0
      ) {
        return res.status(400).send({
          message:
            "Price per night must be a valid amount"
        });
      }


      apartment.pricePerNight =
        newPricePerNight;
    }


    if (dayUsePrice !== undefined) {

      const newDayUsePrice =
        Number(dayUsePrice);


      if (
        !Number.isFinite(
          newDayUsePrice
        ) ||
        newDayUsePrice < 0
      ) {
        return res.status(400).send({
          message:
            "Day-use price must be a valid amount"
        });
      }


      apartment.dayUsePrice =
        newDayUsePrice;
    }

    if (totalUnits !== undefined) {

      const newTotalUnits =
        Number(totalUnits);


      // Must be a whole number
      // and at least 1.

      if (
        !Number.isInteger(
          newTotalUnits
        ) ||
        newTotalUnits < 1
      ) {
        return res.status(400).send({
          message:
            "Total units must be a whole number of at least 1"
        });
      }


      // ========================================
      // ONLY EXTRA CHECK WHEN REDUCING ROOMS
      // ========================================

      if (
        newTotalUnits <
        apartment.totalUnits
      ) {

        const now = new Date();


        // ======================================
        // GET ACTIVE BOOKINGS
        //
        // Confirmed bookings always count.
        //
        // Pending bookings only count while
        // their 15-minute hold is still active.
        // ======================================

        const activeBookings =
          await ApartmentBookingModel.find({
            apartment:
              apartment._id,

            $or: [
              {
                bookingStatus:
                  "confirmed"
              },

              {
                bookingStatus:
                  "pending",

                expiresAt: {
                  $gt: now
                }
              }
            ]
          });


        // ======================================
        // BUILD OCCUPANCY TIMELINE
        // ======================================

        const timeline = [];


        for (
          const booking of activeBookings
        ) {

          const {
            start,
            end
          } =
            getBookingWindow(
              booking
            );


          // Skip invalid booking windows
          // instead of breaking update.

          if (!start || !end) {
            continue;
          }


          // Rooms become occupied here.

          timeline.push({
            time:
              start.getTime(),

            change:
              booking.numberOfUnits
          });


          // Rooms become available here.

          timeline.push({
            time:
              end.getTime(),

            change:
              -booking.numberOfUnits
          });
        }


        // ======================================
        // SORT TIMELINE
        //
        // If one booking ends exactly when
        // another starts, release rooms first.
        // ======================================

        timeline.sort(
          (a, b) =>
            a.time - b.time ||
            a.change - b.change
        );


        // ======================================
        // FIND PEAK NUMBER OF ROOMS COMMITTED
        // AT THE SAME TIME
        // ======================================

        let roomsInUse = 0;

        let maximumRoomsInUse = 0;


        for (
          const point of timeline
        ) {

          roomsInUse +=
            point.change;


          maximumRoomsInUse =
            Math.max(
              maximumRoomsInUse,
              roomsInUse
            );
        }


        // ======================================
        // DON'T ALLOW ORGANIZER TO REDUCE
        // BELOW EXISTING COMMITMENTS
        // ======================================

        if (
          newTotalUnits <
          maximumRoomsInUse
        ) {

          return res.status(400).send({
            message:
              `Total rooms cannot be reduced below ${maximumRoomsInUse} because existing active bookings already require that many rooms`
          });
        }
      }


      apartment.totalUnits =
        newTotalUnits;
    }


    // ==========================================
    // UPDATE AMENITIES
    // ==========================================

    if (amenities !== undefined) {
  let updatedAmenities = amenities;

  if (typeof updatedAmenities === "string") {
    try {
      updatedAmenities = JSON.parse(
        updatedAmenities
      );
    } catch {
      updatedAmenities = updatedAmenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (!Array.isArray(updatedAmenities)) {
    return res.status(400).send({
      message: "Amenities must be an array"
    });
  }

  apartment.amenities = updatedAmenities;
}

const imageTypes = [
  "exterior",
  "livingRoom",
  "bedroom",
  "kitchen",
  "bathroom",
  "balcony",
  "extraView"
];

if (!apartment.images) {
  apartment.images = {};
}

for (const imageType of imageTypes) {
  if (
    req.files &&
    req.files[imageType] &&
    req.files[imageType][0]
  ) {
    const imageUrl = await uploadApartmentImage(
      req.files[imageType][0].buffer,
      imageType
    );

    apartment.images[imageType] = imageUrl;
  }
}

apartment.markModified("images");

    await apartment.save();


    return res.status(200).send({
      message:
        "Apartment updated successfully",

      data:
        apartment
    });


  } catch (error) {

    console.log(
      "UPDATE APARTMENT ERROR:",
      error
    );


    return res.status(500).send({
      message:
        "Cannot update apartment at this time",

      error:
        error.message
    });
  }
};

const toggleApartmentAvailability = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const organizerId = req.user.id;

    const apartment = await ApartmentModel.findById(
      apartmentId
    );

    if (!apartment) {
      return res.status(404).send({
        message: "Apartment not found"
      });
    }

    // Only the organizer who owns it can change it
    if (
      apartment.createdBy.toString() !==
      organizerId.toString()
    ) {
      return res.status(403).send({
        message:
          "You are not authorized to manage this apartment"
      });
    }

    // Switch true → false or false → true
    apartment.isAvailable = !apartment.isAvailable;

    await apartment.save();

    return res.status(200).send({
      message: apartment.isAvailable
        ? "Apartment enabled successfully"
        : "Apartment disabled successfully",
      data: apartment
    });

  } catch (error) {
    console.log(
      "TOGGLE APARTMENT AVAILABILITY ERROR:",
      error
    );

    return res.status(500).send({
      message:
        "Cannot change apartment availability at this time",
      error: error.message
    });
  }
};

const searchAvailableApartments = async (req, res) => {
  try {
    const {
      stayType,
      checkInDate,
      checkOutDate,
      numberOfUnits,
      expectedCheckInTime
    } = req.query;


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
    // VALIDATE DATES
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
          "Number of rooms must be at least 1"
      });
    }


    // ==========================================
    // DAY USE VALIDATION
    // ==========================================

    if (stayType === "day_use") {

      if (
        checkIn.toDateString() !==
        checkOut.toDateString()
      ) {
        return res.status(400).send({
          message:
            "Day use check-in and check-out must be on the same date"
        });
      }
    }


    // ==========================================
    // OVERNIGHT VALIDATION
    // ==========================================

    if (stayType === "overnight") {

      if (checkOut <= checkIn) {
        return res.status(400).send({
          message:
            "Check-out date must be after check-in date"
        });
      }


      if (!expectedCheckInTime) {
        return res.status(400).send({
          message:
            "Expected check-in time is required for overnight stay"
        });
      }


      // Example:
      // 14:00 = 2 PM

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


      const [hours] =
        expectedCheckInTime
          .split(":")
          .map(Number);


      // Overnight normal check-in
      // cannot be before 12 PM

      if (hours < 12) {
        return res.status(400).send({
          message:
            "Overnight check-in starts from 12:00 PM"
        });
      }
    }


    // ==========================================
    // GET ENABLED APARTMENTS
    // ==========================================

    const apartments =
      await ApartmentModel.find({
        isAvailable: true
      }).sort({
        pricePerNight: 1
      });


    const availableApartments = [];


    // ==========================================
    // CHECK EACH APARTMENT
    // ==========================================

    for (const apartment of apartments) {

      const {
        availableUnits
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


      // ========================================
      // ONLY RETURN APARTMENTS THAT HAVE
      // ENOUGH ROOMS
      // ========================================

      if (
        availableUnits >= units
      ) {

        availableApartments.push({
          ...apartment.toObject(),

          availableUnits
        });
      }
    }


    // ==========================================
    // SUCCESS
    // ==========================================

    return res.status(200).send({
      message:
        "Available apartments fetched successfully",

      requestedRooms:
        units,

      data:
        availableApartments
    });

  } catch (error) {

    console.log(
      "SEARCH AVAILABLE APARTMENTS ERROR:",
      error
    );


    return res.status(500).send({
      message:
        "Cannot search apartment availability at this time",

      error:
        error.message
    });
  }
};

module.exports = {
  createApartment,
  getApartments,
  getMyApartments,
  getApartmentById,
  updateApartment,
  toggleApartmentAvailability,
  searchAvailableApartments
};