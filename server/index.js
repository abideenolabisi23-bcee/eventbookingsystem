require("node:dns/promises").setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const userRouter = require("./routes/user.routes");
const eventRouter = require("./routes/event.routes");
const bookingRouter = require("./routes/booking.routes");
const paymentRouter = require("./routes/payment.routes");
const ticketRouter = require("./routes/ticket.routes");
const apartmentRouter = require("./routes/apartment.routes");

const apartmentBookingRouter =
  require("./routes/apartmentBooking.routes");

const apartmentPaymentRouter =
  require("./routes/apartmentPayment.routes");

const foodRouter = require("./routes/food.routes");
const foodOrderRouter = require("./routes/foodOrder.routes");

const foodPaymentRouter =
  require("./routes/foodPayment.routes");

const adminRouter =
  require("./routes/admin.routes");

const organizerRouter =
  require("./routes/organizer.routes");

const apartmentTicketRouter =
  require("./routes/apartmentTicket.routes");

const app = express();

app.use(cors());

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use("/api/v1", userRouter);
app.use("/api/v1", eventRouter);
app.use("/api/v1", bookingRouter);
app.use("/api/v1", paymentRouter);
app.use("/api/v1", ticketRouter);
app.use("/api/v1", apartmentRouter);
app.use("/api/v1", apartmentBookingRouter);
app.use("/api/v1", apartmentPaymentRouter);
app.use("/api/v1", apartmentTicketRouter);
app.use("/api/v1", foodRouter);
app.use("/api/v1", foodOrderRouter);
app.use("/api/v1", foodPaymentRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/organizer", organizerRouter);

connectDB();

app.get("/", (req, res) => {
  res.send("Event Booking API is running");
});

const PORT = process.env.PORT || 5005;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server started on port ${PORT}`
  );
  console.log(`Network: http://192.168.0.3:${PORT}`);
});