const dns = require("node:dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const mongoose = require("mongoose");

const EventModel = require("./models/event.model");

const fixTicketCategoryIds = async () => {
  try {
    await mongoose.connect(process.env.DB_URI);

    console.log("Database connected successfully");

    const eventId = "6ac011864fca5052f9bcfe3e";

    const collection = EventModel.collection;

    const event = await collection.findOne({
      _id: new mongoose.Types.ObjectId(eventId)
    });

    if (!event) {
      console.log("Event not found");
      return;
    }

    const ticketTypes = event.ticketTypes || [];

    if (ticketTypes.length === 0) {
      console.log("Event has no ticket categories");
      return;
    }

    const updatedTicketTypes = ticketTypes.map((ticket) => ({
      ...ticket,
      _id: ticket._id || new mongoose.Types.ObjectId()
    }));

    const result = await collection.updateOne(
      {
        _id: event._id,
        ticketTypes: event.ticketTypes
      },
      {
        $set: {
          ticketTypes: updatedTicketTypes
        }
      }
    );

    if (result.modifiedCount !== 1) {
      console.log(
        "No changes saved. The event may have changed. Check it before retrying."
      );
      return;
    }

    console.log("Ticket category IDs saved successfully");

    updatedTicketTypes.forEach((ticket) => {
      console.log(`${ticket.name}: ${ticket._id}`);
    });
  } catch (error) {
    console.log("ERROR:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

fixTicketCategoryIds();
