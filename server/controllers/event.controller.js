const EventModel = require("../models/event.model");
const UserModel = require("../models/user.model");
const cloudinary = require("../config/cloudinary");

const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      date,
      price,
      totalTickets
    } = req.body;

    if (
      !title ||
      !description ||
      !location ||
      !date ||
      price === undefined ||
      totalTickets === undefined
    ) {
      return res.status(400).send({
        message: "All event fields are required"
      });
    }

    let imageUrl = null;

    if (req.file) {
      const result = await new Promise(
        (resolve, reject) => {
          const uploadStream =
            cloudinary.uploader.upload_stream(
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

          uploadStream.end(req.file.buffer);
        }
      );

      imageUrl = result.secure_url;
    }

    const event = await EventModel.create({
      title,
      description,
      location,
      date,
      price: Number(price),
      totalTickets: Number(totalTickets),
      availableTickets: Number(totalTickets),
      image: imageUrl,
      createdBy: req.user.id
    });

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
    console.log(error);

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
      isAvailable
    } = req.body;

    const updateData = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (location !== undefined) {
      updateData.location = location;
    }

    if (date !== undefined) {
      updateData.date = date;
    }

    if (price !== undefined) {
      updateData.price = Number(price);
    }

    if (isAvailable !== undefined) {
      updateData.isAvailable =
        isAvailable === true || isAvailable === "true";
    }

    if (totalTickets !== undefined) {
      const newTotalTickets = Number(totalTickets);

      if (Number.isNaN(newTotalTickets) || newTotalTickets < 0) {
        return res.status(400).send({
          message: "Total tickets must be a valid number"
        });
      }

      const occupiedTickets =
        event.totalTickets - event.availableTickets;

      if (newTotalTickets < occupiedTickets) {
        return res.status(400).send({
          message: `Total capacity cannot be less than ${occupiedTickets} because ${occupiedTickets} tickets are currently active`
        });
      }

      updateData.totalTickets = newTotalTickets;
      updateData.availableTickets =
        newTotalTickets - occupiedTickets;
    }

    if (req.file) {
      const result = await new Promise(
        (resolve, reject) => {
          const uploadStream =
            cloudinary.uploader.upload_stream(
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

          uploadStream.end(req.file.buffer);
        }
      );

      updateData.image = result.secure_url;
    }

    const updatedEvent =
      await EventModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true
        }
      );

    return res.status(200).send({
      message: "Event updated successfully",
      data: updatedEvent
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
    console.log(error);

    return res.status(400).send({
      message: "Cannot delete event at this time"
    });
  }
};

const getMyEvents = async (req, res) => {
  try {
    const { id } = req.user;

    const events = await EventModel.find({
      createdBy: id
    });

    return res.status(200).send({
      message: "Organizer events fetched successfully",
      data: events
    });

  } catch (error) {
    console.log(error);

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

    // Make sure email was provided
    if (!email) {
      return res.status(400).send({
        message: "Staff email is required"
      });
    }

    // Find the event
    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    // Make sure logged-in organizer owns this event
    if (event.createdBy.toString() !== organizerId) {
      return res.status(403).send({
        message: "You cannot add staff to this event"
      });
    }

    // Find the staff member using their email
    const staff = await UserModel.findOne({ email });

    if (!staff) {
      return res.status(404).send({
        message: "No user found with this email"
      });
    }

    // Prevent organizer from adding themselves as staff
    if (staff._id.toString() === organizerId) {
      return res.status(400).send({
        message: "You are already the organizer of this event"
      });
    }

    // Prevent adding the same person twice
    const alreadyStaff = event.checkInStaff.some(
      (staffId) =>
        staffId.toString() === staff._id.toString()
    );

    if (alreadyStaff) {
      return res.status(400).send({
        message: "This user is already check-in staff for this event"
      });
    }

    // Add user to event staff
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

    // Find event
    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    // Only the organizer who owns the event can remove staff
    if (event.createdBy.toString() !== organizerId) {
      return res.status(403).send({
        message: "You cannot remove staff from this event"
      });
    }

    // Check whether this person is actually assigned
    const isAssignedStaff = event.checkInStaff.some(
      (id) => id.toString() === staffId
    );

    if (!isAssignedStaff) {
      return res.status(404).send({
        message: "This user is not staff for this event"
      });
    }

    // Remove staff from the event
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