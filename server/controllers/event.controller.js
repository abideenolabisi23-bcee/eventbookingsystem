const mongoose = require("mongoose");
const EventModel = require("../models/event.model");
const UserModel = require("../models/user.model");
const cloudinary = require("../config/cloudinary");

const uploadEventImage = async (file) => {
  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "vibely/events",
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(file.buffer);
  });

  return result.secure_url;
};


const parseTicketTypes = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const parsed =
    typeof value === "string" ? JSON.parse(value) : value;

  if (!Array.isArray(parsed)) {
    throw new Error("Ticket types must be an array");
  }

  if (parsed.length === 0) {
    throw new Error("Add at least one ticket category");
  }

  const names = new Set();
  const ids = new Set();

  return parsed.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Invalid ticket category");
    }

    const name = String(item.name || "").trim();
    const price = Number(item.price);
    const totalTickets = Number(item.totalTickets);

    const categoryId =
      item._id === undefined || item._id === null || item._id === ""
        ? undefined
        : String(item._id);

    if (!name) {
      throw new Error("Every ticket category must have a name");
    }

    if (names.has(name.toLowerCase())) {
      throw new Error(`Duplicate ticket category: ${name}`);
    }

    names.add(name.toLowerCase());

    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Invalid price for ${name}`);
    }

    if (
      !Number.isSafeInteger(totalTickets) ||
      totalTickets < 0
    ) {
      throw new Error(`Invalid ticket capacity for ${name}`);
    }

    if (categoryId) {
      if (!mongoose.isValidObjectId(categoryId)) {
        throw new Error(`Invalid ticket category ID for ${name}`);
      }

      if (ids.has(categoryId.toLowerCase())) {
        throw new Error("Duplicate ticket category ID");
      }

      ids.add(categoryId.toLowerCase());
    }

    return {
      _id: categoryId,
      name,
      price,
      totalTickets
    };
  });
};


const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      date,
      price,
      totalTickets,
      ticketTypes
    } = req.body;

    if (!title || !description || !location || !date) {
      return res.status(400).send({
        message: "Title, description, location and date are required"
      });
    }

    const parsedTypes = parseTicketTypes(ticketTypes);

    let eventData = {
      title,
      description,
      location,
      date,
      createdBy: req.user.id
    };

    if (parsedTypes) {
      const categories = parsedTypes.map((item) => ({
        ...item,
        availableTickets: item.totalTickets
      }));

      eventData.ticketTypes = categories;

      eventData.totalTickets = categories.reduce(
        (sum, item) => sum + item.totalTickets,
        0
      );

      eventData.availableTickets = eventData.totalTickets;

      eventData.price = Math.min(
        ...categories.map((item) => item.price)
      );
    } else {
      const legacyPrice = Number(price);
      const legacyTotal = Number(totalTickets);

      if (
        price === undefined ||
        totalTickets === undefined ||
        !Number.isFinite(legacyPrice) ||
        legacyPrice < 0 ||
        !Number.isSafeInteger(legacyTotal) ||
        legacyTotal < 0
      ) {
        return res.status(400).send({
          message: "Provide valid event price and ticket capacity"
        });
      }

      eventData.price = legacyPrice;
      eventData.totalTickets = legacyTotal;
      eventData.availableTickets = legacyTotal;
    }

    if (req.file) {
      eventData.image = await uploadEventImage(req.file);
    }

    const event = await EventModel.create(eventData);

    return res.status(201).send({
      message: "Event created successfully",
      data: event
    });
  } catch (error) {
    console.log("CREATE EVENT ERROR:", error);

    return res.status(400).send({
      message: "Event cannot be created at this time",
      error: error.message
    });
  }
};

const getEvents = async (req, res) => {
  try {
    const events = await EventModel.find()
      .populate("createdBy", "firstname lastname email role");

    return res.status(200).send({
      message: "Events fetched successfully",
      data: events
    });
  } catch (error) {
    console.log("GET EVENTS ERROR:", error);

    return res.status(400).send({
      message: "Cannot fetch events at this time"
    });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await EventModel.findById(id)
      .populate(
        "createdBy",
        "firstname lastname email role businessName"
      )
      .populate(
        "checkInStaff",
        "firstname lastname email"
      );

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    return res.status(200).send({
      message: "Event fetched successfully",
      data: event
    });
  } catch (error) {
    console.log("GET EVENT ERROR:", error);

    return res.status(400).send({
      message: "Cannot fetch event at this time",
      error: error.message
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await EventModel.findById(id);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).send({
        message: "You cannot update this event"
      });
    }

    const {
      title,
      description,
      location,
      date,
      price,
      totalTickets,
      ticketTypes,
      isAvailable
    } = req.body;

    if (title !== undefined) {
      event.title = title;
    }

    if (description !== undefined) {
      event.description = description;
    }

    if (location !== undefined) {
      event.location = location;
    }

    if (date !== undefined) {
      event.date = date;
    }

    if (isAvailable !== undefined) {
      event.isAvailable =
        isAvailable === true || isAvailable === "true";
    }

    const parsedTypes = parseTicketTypes(ticketTypes);

    if (parsedTypes) {
      if (
        !event.ticketTypes.length &&
        event.totalTickets - event.availableTickets > 0
      ) {
        return res.status(400).send({
          message:
            "Existing bookings must be migrated before converting this event to ticket categories"
        });
      }

      const existingTypes = event.ticketTypes || [];

      const updatedTypes = [];

      for (const item of parsedTypes) {
        let existing = null;

        if (item._id) {
          existing = existingTypes.find(
            (type) => type._id.toString() === String(item._id)
          );

          if (!existing) {
            return res.status(400).send({
              message: `Unknown ticket category ID for ${item.name}`
            });
          }
        } else {
          existing = existingTypes.find(
            (type) =>
              type.name.toLowerCase() === item.name.toLowerCase()
          );
        }

        let soldTickets = 0;

        
if (existing) {
  soldTickets =
    existing.totalTickets - existing.availableTickets;

  if (soldTickets < 0) {
    return res.status(400).send({
      message: `Invalid existing inventory for ${item.name}`
    });
  }

  if (
    soldTickets > 0 &&
    existing.name.toLowerCase() !== item.name.toLowerCase()
  ) {
    return res.status(400).send({
      message:
        `You cannot rename ${existing.name} because ` +
        "tickets have already been sold or reserved"
    });
  }
}


        if (item.totalTickets < soldTickets) {
          return res.status(400).send({
            message:
              `${item.name} capacity cannot be less than ` +
              `${soldTickets} already reserved tickets`
          });
        }

        updatedTypes.push({
          _id: existing?._id || item._id,
          name: item.name,
          price: item.price,
          totalTickets: item.totalTickets,
          availableTickets: item.totalTickets - soldTickets
        });
      }

      const retainedIds = new Set(
        updatedTypes
          .filter((item) => item._id)
          .map((item) => String(item._id))
      );

      for (const existing of existingTypes) {
        if (!retainedIds.has(String(existing._id))) {
          const reserved =
            existing.totalTickets - existing.availableTickets;

          if (reserved > 0) {
            return res.status(400).send({
              message:
                `Cannot remove ${existing.name} because tickets ` +
                "have already been reserved"
            });
          }
        }
      }

      event.ticketTypes = updatedTypes;

      event.totalTickets = updatedTypes.reduce(
        (sum, item) => sum + item.totalTickets,
        0
      );

      event.availableTickets = updatedTypes.reduce(
        (sum, item) => sum + item.availableTickets,
        0
      );

      event.price = Math.min(
        ...updatedTypes.map((item) => item.price)
      );
    } else if (event.ticketTypes.length === 0) {
      if (price !== undefined) {
        const newPrice = Number(price);

        if (!Number.isFinite(newPrice) || newPrice < 0) {
          return res.status(400).send({
            message: "Price must be a valid number"
          });
        }

        event.price = newPrice;
      }

      if (totalTickets !== undefined) {
        const newTotal = Number(totalTickets);

        if (!Number.isSafeInteger(newTotal) || newTotal < 0) {
          return res.status(400).send({
            message: "Total tickets must be a valid number"
          });
        }

        const reserved =
          event.totalTickets - event.availableTickets;

        if (newTotal < reserved) {
          return res.status(400).send({
            message:
              `Total capacity cannot be less than ${reserved}`
          });
        }

        event.totalTickets = newTotal;
        event.availableTickets = newTotal - reserved;
      }
    } else if (
      price !== undefined ||
      totalTickets !== undefined
    ) {
      return res.status(400).send({
        message:
          "Update ticketTypes instead of the overall price or capacity"
      });
    }

   
if (req.file) {
  event.image = await uploadEventImage(req.file);
}

if (event.ticketTypes && event.ticketTypes.length > 0) {
  event.totalTickets = event.ticketTypes.reduce(
    (sum, category) =>
      sum + Number(category.totalTickets),
    0
  );

  event.availableTickets = event.ticketTypes.reduce(
    (sum, category) =>
      sum + Number(category.availableTickets),
    0
  );
}


try {
  await event.save();
} catch (error) {
  if (
    error.name === "VersionError" ||
    error.code === 112
  ) {
    return res.status(409).send({
      message:
        "This event was updated while you were editing it. Please refresh the event and try again."
    });
  }

  throw error;
}



    return res.status(200).send({
      message: "Event updated successfully",
      data: event
    });
  } catch (error) {
    console.log("UPDATE EVENT ERROR:", error);

    return res.status(400).send({
      message: "Cannot update event at this time",
      error: error.message
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await EventModel.findById(id);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).send({
        message: "You cannot delete this event"
      });
    }

    await EventModel.findByIdAndDelete(id);

    return res.status(200).send({
      message: "Event deleted successfully"
    });
  } catch (error) {
    console.log("DELETE EVENT ERROR:", error);

    return res.status(400).send({
      message: "Cannot delete event at this time"
    });
  }
};

const getMyEvents = async (req, res) => {
  try {
    const events = await EventModel.find({
      createdBy: req.user.id
    });

    return res.status(200).send({
      message: "Organizer events fetched successfully",
      data: events
    });
  } catch (error) {
    console.log("GET MY EVENTS ERROR:", error);

    return res.status(400).send({
      message: "Cannot fetch organizer events at this time"
    });
  }
};

const addEventStaff = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { email } = req.body;
    const organizerId = req.user.id;

    if (!email) {
      return res.status(400).send({
        message: "Staff email is required"
      });
    }

    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.createdBy.toString() !== organizerId) {
      return res.status(403).send({
        message: "You cannot add staff to this event"
      });
    }

    const staff = await UserModel.findOne({
      email: email.trim().toLowerCase()
    });

    if (!staff) {
      return res.status(404).send({
        message: "No user found with this email"
      });
    }

    if (staff._id.toString() === organizerId) {
      return res.status(400).send({
        message: "You are already the organizer of this event"
      });
    }

    const alreadyStaff = event.checkInStaff.some(
      (staffId) =>
        staffId.toString() === staff._id.toString()
    );

    if (alreadyStaff) {
      return res.status(400).send({
        message: "This user is already check-in staff for this event"
      });
    }

    event.checkInStaff.push(staff._id);

    await event.save();

    return res.status(200).send({
      message: "Staff added successfully",
      data: {
        eventId: event._id,
        staff: {
          _id: staff._id,
          firstname: staff.firstname,
          lastname: staff.lastname,
          email: staff.email
        }
      }
    });
  } catch (error) {
    console.log("ADD EVENT STAFF ERROR:", error);

    return res.status(400).send({
      message: "Cannot add staff at this time",
      error: error.message
    });
  }
};

const removeEventStaff = async (req, res) => {
  try {
    const { eventId, staffId } = req.params;
    const organizerId = req.user.id;

    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.createdBy.toString() !== organizerId) {
      return res.status(403).send({
        message: "You cannot remove staff from this event"
      });
    }

    const isAssignedStaff = event.checkInStaff.some(
      (id) => id.toString() === staffId
    );

    if (!isAssignedStaff) {
      return res.status(404).send({
        message: "This user is not staff for this event"
      });
    }

    event.checkInStaff = event.checkInStaff.filter(
      (id) => id.toString() !== staffId
    );

    await event.save();

    return res.status(200).send({
      message: "Staff removed successfully"
    });
  } catch (error) {
    console.log("REMOVE EVENT STAFF ERROR:", error);

    return res.status(400).send({
      message: "Cannot remove staff at this time",
      error: error.message
    });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getMyEvents,
  addEventStaff,
  removeEventStaff
};