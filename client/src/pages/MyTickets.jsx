import { useEffect, useMemo, useState } from "react";

import {

  Link,

  useLocation,

  useNavigate,

} from "react-router-dom";

import axios from "axios";



import Navbar from "../component/Navbar";

import DetailFooter from "../component/DetailFooter";



import "../styles/myTickets.css";



import vibelyLogo from "../assets/vibely-logo.png";

import concertImage from "../assets/concert.jpg";



const MyTickets = () => {

  const navigate = useNavigate();

  const location = useLocation();



  const searchParams = new URLSearchParams(

    location.search

  );



  const typeFromUrl =

    searchParams.get("type") || "all";



  const bookingFromUrl =

    searchParams.get("booking");



  const [eventTickets, setEventTickets] =

    useState([]);



  const [apartmentTickets, setApartmentTickets] =

    useState([]);

  const [foodOrders, setFoodOrders] =
    useState([]);



  const [activeFilter, setActiveFilter] =

    useState(typeFromUrl);



  const [loading, setLoading] = useState(true);



  const [error, setError] = useState("");



  useEffect(() => {

    const fetchTickets = async () => {

      const accessToken =

        localStorage.getItem("accessToken");



      if (!accessToken) {

        navigate("/login", {

          state: {

            returnTo:

              location.pathname +

              location.search,

          },

        });



        return;

      }



      try {

        setLoading(true);

        setError("");



        const headers = {

          Authorization: `Bearer ${accessToken}`,

        };



        const [

          eventResponse,

          apartmentResponse,
          foodResponse,

        ] = await Promise.all([

          axios.get(

            "http://https://eventbookingsystem-sooty.vercel.app/api/v1/tickets/my",

            {

              headers,

            }

          ),



          axios.get(

            "http://https://eventbookingsystem-sooty.vercel.app/api/v1/apartment-tickets/my",

            {

              headers,

            }

          ),

          axios.get(
            "http://https://eventbookingsystem-sooty.vercel.app/api/v1/food-orders/my",
            {
              headers,
            }
          ),

        ]);



        setEventTickets(

          eventResponse.data.data || []

        );



        setApartmentTickets(

          apartmentResponse.data.data || []

        );

        setFoodOrders(
          foodResponse.data.data || []
        );

      } catch (error) {

        console.log(

          "MY TICKETS ERROR:",

          error

        );



        if (error.response?.status === 401) {

          localStorage.removeItem(

            "accessToken"

          );



          localStorage.removeItem(

            "refreshToken"

          );



          navigate("/login", {

            state: {

              returnTo:

                location.pathname +

                location.search,

            },

          });



          return;

        }



        setError(

          error.response?.data?.message ||

          "Unable to load your tickets."

        );

      } finally {

        setLoading(false);

      }

    };



    fetchTickets();

  }, [

    navigate,

    location.pathname,

    location.search,

  ]);



  useEffect(() => {

    if (

      ["all", "event", "apartment", "food"].includes(

        typeFromUrl

      )

    ) {

      setActiveFilter(typeFromUrl);

    }

  }, [typeFromUrl]);



  const formatPrice = (price) => {

    return new Intl.NumberFormat("en-NG", {

      style: "currency",

      currency: "NGN",

      maximumFractionDigits: 0,

    }).format(price || 0);

  };



  const formatDate = (date) => {

    if (!date) {

      return "Date unavailable";

    }



    return new Intl.DateTimeFormat(

      "en-NG",

      {

        day: "numeric",

        month: "short",

        year: "numeric",

      }

    ).format(new Date(date));

  };



  const formatEventDate = (date) => {

    if (!date) {

      return "Date unavailable";

    }



    return new Intl.DateTimeFormat(

      "en-NG",

      {

        weekday: "short",

        day: "numeric",

        month: "long",

        year: "numeric",

        hour: "numeric",

        minute: "2-digit",

      }

    ).format(new Date(date));

  };



  const formatStatus = (status) => {

    if (!status) {

      return "Valid";

    }



    return status

      .replaceAll("_", " ")

      .replace(/\b\w/g, (letter) =>

        letter.toUpperCase()

      );

  };



  const getStatusIcon = (status) => {

    if (status === "used") {

      return "bi bi-check2-all";

    }



    if (status === "refund_pending") {

      return "bi bi-clock-history";

    }



    if (status === "cancelled") {

      return "bi bi-x-circle";

    }



    return "bi bi-check-circle-fill";

  };



  const allTickets = useMemo(() => {
    const events = eventTickets.map((ticket) => ({
      ...ticket,
      vibelyTicketType: "event",
    }));

    const apartments = apartmentTickets.map((ticket) => ({
      ...ticket,
      vibelyTicketType: "apartment",
    }));

    const foods = foodOrders
      .filter((order) =>
        ["paid", "refund_pending", "refunded"].includes(
          order.paymentStatus
        )
      )
      .map((order) => ({
        ...order,
        vibelyTicketType: "food",
        status:
          order.orderStatus === "completed"
            ? "used"
            : order.orderStatus === "cancelled" ||
              order.paymentStatus === "refunded"
              ? "cancelled"
              : order.paymentStatus === "refund_pending"
                ? "refund_pending"
                : "valid",
      }));

    return [...events, ...apartments, ...foods];
  }, [eventTickets, apartmentTickets, foodOrders]);



  const filteredTickets = useMemo(() => {

    if (activeFilter === "event") {

      return allTickets.filter(

        (ticket) =>

          ticket.vibelyTicketType ===

          "event"

      );

    }



    if (activeFilter === "apartment") {

      return allTickets.filter(

        (ticket) =>

          ticket.vibelyTicketType ===

          "apartment"

      );

    }



    if (activeFilter === "food") {
      return allTickets.filter(
        (ticket) => ticket.vibelyTicketType === "food"
      );
    }



    return allTickets;

  }, [activeFilter, allTickets]);



  const validTickets = allTickets.filter(

    (ticket) => ticket.status === "valid"

  ).length;



  const usedTickets = allTickets.filter(

    (ticket) => ticket.status === "used"

  ).length;



  const inactiveTickets =

    allTickets.filter(

      (ticket) =>

        ticket.status === "cancelled" ||

        ticket.status ===

        "refund_pending"

    ).length;



  const handleFilter = (filter) => {

    setActiveFilter(filter);



    if (filter === "all") {

      navigate("/my-tickets");

      return;

    }



    navigate(

      `/my-tickets?type=${filter}`

    );

  };



  if (loading) {

    return (

      <>

        <Navbar />



        <div className="my-tickets-status">

          <div className="my-tickets-loader"></div>



          <p>Loading your tickets...</p>

        </div>



        <DetailFooter />

      </>

    );

  }



  return (

    <>

      <Navbar />



      <main className="my-tickets-page">

        <section className="my-tickets-hero">

          <div className="ticket-hero-glow ticket-hero-glow-one"></div>



          <div className="ticket-hero-glow ticket-hero-glow-two"></div>



          <div className="my-tickets-hero-inner">

            <div className="my-tickets-hero-copy">

              <span className="tickets-eyebrow">

                YOUR VIBELY COLLECTION

              </span>



              <h1>

                Your moments.

                <br />

                <em>Your tickets.</em>

              </h1>



              <p>

                Your event passes, apartment stay

                passes and food pickup passes are

                stored beautifully in one place.

                Keep your digital pass ready when

                it's time to show up.

              </p>

            </div>



            <div className="tickets-hero-pass">

              <div className="tickets-pass-logo">

                <img

                  src={vibelyLogo}

                  alt="Vibely"

                />

              </div>



              <div>

                <span>

                  VIBELY MEMBER PASS

                </span>



                <strong>

                  {allTickets.length}{" "}

                  {allTickets.length === 1

                    ? "Ticket"

                    : "Tickets"}

                </strong>



                <p>

                  EVENTS · STAYS · EXPERIENCES

                </p>

              </div>

            </div>

          </div>

        </section>



        <section className="my-tickets-content">

          {error && (

            <div className="tickets-error">

              <div className="tickets-error-icon">

                <i className="bi bi-exclamation-circle"></i>

              </div>



              <div>

                <strong>

                  We couldn't load your tickets.

                </strong>



                <p>{error}</p>

              </div>

            </div>

          )}



          {!error && (

            <div className="ticket-filter-showcase">

              <button

                type="button"

                className={`ticket-filter-card all-ticket-filter ${activeFilter === "all" ? "active" : ""

                  }`}

                onClick={() => handleFilter("all")}

              >

                <div className="ticket-filter-card-top">

                  <div className="ticket-filter-card-icon">

                    <i className="bi bi-grid-fill"></i>

                  </div>



                  <span className="ticket-filter-card-count">

                    {allTickets.length}

                  </span>

                </div>



                <div className="ticket-filter-card-copy">

                  <span className="ticket-filter-card-label">

                    YOUR COLLECTION

                  </span>



                  <h3>All Tickets</h3>



                  <p>

                    Every Vibely pass in one beautiful collection.

                  </p>

                </div>



                <div className="ticket-filter-card-footer">

                  <span>

                    View collection

                  </span>



                  <div className="ticket-filter-arrow">

                    <i className="bi bi-arrow-right"></i>

                  </div>

                </div>

              </button>



              <button

                type="button"

                className={`ticket-filter-card event-ticket-filter ${activeFilter === "event" ? "active" : ""

                  }`}

                onClick={() => handleFilter("event")}

              >

                <div className="ticket-filter-card-top">

                  <div className="ticket-filter-card-icon">

                    <i className="bi bi-ticket-perforated-fill"></i>

                  </div>



                  <span className="ticket-filter-card-count">

                    {eventTickets.length}

                  </span>

                </div>



                <div className="ticket-filter-card-copy">

                  <span className="ticket-filter-card-label">

                    EXPERIENCES

                  </span>



                  <h3>Event Tickets</h3>



                  <p>

                    Your concerts, shows and unforgettable moments.

                  </p>

                </div>



                <div className="ticket-filter-card-footer">

                  <span>

                    View events

                  </span>



                  <div className="ticket-filter-arrow">

                    <i className="bi bi-arrow-right"></i>

                  </div>

                </div>

              </button>



              <button

                type="button"

                className={`ticket-filter-card apartment-ticket-filter ${activeFilter === "apartment" ? "active" : ""

                  }`}

                onClick={() => handleFilter("apartment")}

              >

                <div className="ticket-filter-card-top">

                  <div className="ticket-filter-card-icon">

                    <i className="bi bi-house-heart-fill"></i>

                  </div>



                  <span className="ticket-filter-card-count">

                    {apartmentTickets.length}

                  </span>

                </div>



                <div className="ticket-filter-card-copy">

                  <span className="ticket-filter-card-label">

                    STAYS

                  </span>



                  <h3>Apartment Passes</h3>



                  <p>

                    Your reserved stays and digital check-in passes.

                  </p>

                </div>



                <div className="ticket-filter-card-footer">

                  <span>

                    View stays

                  </span>



                  <div className="ticket-filter-arrow">

                    <i className="bi bi-arrow-right"></i>

                  </div>

                </div>

              </button>



              <button

                type="button"

                className={`ticket-filter-card food-ticket-filter ${activeFilter === "food" ? "active" : ""

                  }`}

                onClick={() => handleFilter("food")}

              >

                <div className="ticket-filter-card-top">

                  <div className="ticket-filter-card-icon">

                    <i className="bi bi-bag-heart-fill"></i>

                  </div>



                  <span className="ticket-filter-card-count">

                    0

                  </span>

                </div>



                <div className="ticket-filter-card-copy">

                  <span className="ticket-filter-card-label">

                    FOOD & DINING

                  </span>



                  <h3>Food Passes</h3>



                  <p>

                    Your food orders and pickup passes will live here.

                  </p>

                </div>



                <div className="ticket-filter-card-footer">

                  <span>

                    View orders

                  </span>



                  <div className="ticket-filter-arrow">

                    <i className="bi bi-arrow-right"></i>

                  </div>

                </div>

              </button>

            </div>

          )}



          {!error &&

            allTickets.length > 0 && (

              <section className="tickets-summary">

                <div className="tickets-summary-card">

                  <div className="tickets-summary-icon">

                    <i className="bi bi-ticket-perforated"></i>

                  </div>



                  <div>

                    <span>

                      ALL TICKETS

                    </span>



                    <strong>

                      {allTickets.length}

                    </strong>



                    <p>

                      Your collection

                    </p>

                  </div>

                </div>



                <div className="tickets-summary-card">

                  <div className="tickets-summary-icon">

                    <i className="bi bi-check-circle"></i>

                  </div>



                  <div>

                    <span>VALID</span>



                    <strong>

                      {validTickets}

                    </strong>



                    <p>

                      Ready to use

                    </p>

                  </div>

                </div>



                <div className="tickets-summary-card">

                  <div className="tickets-summary-icon">

                    <i className="bi bi-clock-history"></i>

                  </div>



                  <div>

                    <span>USED</span>



                    <strong>

                      {usedTickets}

                    </strong>



                    <p>

                      Past experiences

                    </p>

                  </div>

                </div>



                <div className="tickets-summary-card">

                  <div className="tickets-summary-icon">

                    <i className="bi bi-arrow-counterclockwise"></i>

                  </div>



                  <div>

                    <span>OTHER</span>



                    <strong>

                      {inactiveTickets}

                    </strong>



                    <p>

                      Cancelled or refund

                    </p>

                  </div>

                </div>

              </section>

            )}



          {!error &&

            filteredTickets.length === 0 && (

              <div className="empty-tickets">

                <div className="empty-ticket-icon">

                  <i className="bi bi-ticket-perforated"></i>

                </div>



                <span>

                  YOUR COLLECTION

                </span>



                <h2>

                  {activeFilter ===

                    "apartment"

                    ? "No apartment tickets yet."

                    : activeFilter ===

                      "event"

                      ? "No event tickets yet."

                      : activeFilter ===

                        "food"

                        ? "No food order passes yet."

                        : "Your first Vibely moment starts here."}

                </h2>



                <p>

                  {activeFilter ===

                    "apartment"

                    ? "Your apartment stay pass will appear here after a successful apartment payment."

                    : activeFilter ===

                      "food"

                      ? "Your paid food order passes will appear here with the pickup code you need for collection."

                      : "Once you complete a booking, your Vibely digital pass will appear here automatically."}

                </p>



                {activeFilter ===

                  "apartment" ? (

                  <Link to="/apartments">

                    Explore Apartments

                    <i className="bi bi-arrow-right"></i>

                  </Link>

                ) : (

                  <Link to="/events">

                    Explore Events

                    <i className="bi bi-arrow-right"></i>

                  </Link>

                )}

              </div>

            )}



          {!error &&

            filteredTickets.length > 0 && (

              <>

                <div className="tickets-heading">

                  <div>

                    <span>

                      YOUR DIGITAL PASSES

                    </span>



                    <h2>

                      Ready when you are.

                    </h2>



                    <p>

                      Keep your event or apartment

                      QR code ready when you arrive,

                      and use your pickup code when

                      collecting a food order.

                    </p>

                  </div>

                </div>



                <div className="tickets-grid">

                  {filteredTickets.map(

                    (ticket, index) => {

                      if (
                        ticket.vibelyTicketType === "food"
                      ) {
                        const vendorName =
                          ticket.vendor?.businessName ||
                          `${ticket.vendor?.firstname || ""} ${ticket.vendor?.lastname || ""}`.trim() ||
                          "Vibely Food Vendor";

                        const totalItems =
                          ticket.items?.reduce(
                            (total, item) =>
                              total + Number(item.quantity || 0),
                            0
                          ) || 0;

                        const isReady =
                          ticket.orderStatus === "ready";

                        const isCompleted =
                          ticket.orderStatus === "completed";

                        return (
                          <article
                            className={`food-digital-pass ${isCompleted
                              ? "food-pass-completed"
                              : ""
                              }`}
                            key={ticket._id}
                          >
                            <div className="food-pass-header">
                              <div className="food-pass-brand">
                                <img
                                  src={vibelyLogo}
                                  alt="Vibely"
                                />

                                <div>
                                  <strong>VIBELY</strong>
                                  <span>FOOD PASS</span>
                                </div>
                              </div>

                              <span
                                className={`food-pass-status ${isReady ? "ready" : ""
                                  } ${isCompleted ? "completed" : ""
                                  }`}
                              >
                                <i
                                  className={
                                    isCompleted
                                      ? "bi bi-check2-all"
                                      : isReady
                                        ? "bi bi-bag-check-fill"
                                        : "bi bi-clock-history"
                                  }
                                ></i>

                                {isCompleted
                                  ? "COMPLETED"
                                  : isReady
                                    ? "READY FOR PICKUP"
                                    : formatStatus(ticket.orderStatus)}
                              </span>
                            </div>

                            <div className="food-pass-body">
                              <div className="food-pass-intro">
                                <span>YOUR FOOD ORDER</span>

                                <h2>
                                  {isCompleted
                                    ? "Order collected."
                                    : isReady
                                      ? "Your food is ready."
                                      : "Your order is being prepared."}
                                </h2>

                                <p>
                                  Prepared by <strong>{vendorName}</strong>
                                </p>
                              </div>

                              <div className="food-pass-items">
                                <div className="food-pass-section-title">
                                  <span>ORDER ITEMS</span>
                                  <strong>
                                    {totalItems} {totalItems === 1 ? "ITEM" : "ITEMS"}
                                  </strong>
                                </div>

                                {ticket.items?.map((item, itemIndex) => (
                                  <div
                                    className="food-pass-item"
                                    key={item._id || `${item.name}-${itemIndex}`}
                                  >
                                    <div>
                                      <span className="food-pass-quantity">
                                        {item.quantity}×
                                      </span>

                                      <div>
                                        <strong>{item.name}</strong>
                                        <small>
                                          {formatPrice(item.price)} each
                                        </small>
                                      </div>
                                    </div>

                                    <strong>
                                      {formatPrice(item.subtotal)}
                                    </strong>
                                  </div>
                                ))}
                              </div>

                              <div className="food-pass-code-area">
                                <span>
                                  {isCompleted
                                    ? "PICKUP CODE USED"
                                    : "YOUR PICKUP CODE"}
                                </span>

                                <strong>
                                  {ticket.pickupCode || "Preparing..."}
                                </strong>

                                <p>
                                  {isCompleted
                                    ? "This order has already been collected."
                                    : isReady
                                      ? "Show this code to the vendor when collecting your food."
                                      : "Keep this code private. You will use it when your order is ready."}
                                </p>
                              </div>

                              <div className="food-pass-information">
                                <div>
                                  <span>ORDER REFERENCE</span>
                                  <strong>
                                    {ticket.orderReference || "—"}
                                  </strong>
                                </div>

                                <div>
                                  <span>TOTAL PAID</span>
                                  <strong>
                                    {formatPrice(ticket.totalAmount)}
                                  </strong>
                                </div>

                                <div>
                                  <span>PAYMENT</span>
                                  <strong>
                                    {formatStatus(ticket.paymentStatus)}
                                  </strong>
                                </div>

                                <div>
                                  <span>ORDER STATUS</span>
                                  <strong>
                                    {formatStatus(ticket.orderStatus)}
                                  </strong>
                                </div>
                              </div>

                              <div className="food-pass-footer">
                                <div>
                                  <i className="bi bi-shield-check"></i>
                                  <p>
                                    Your pickup code belongs to this order. Only
                                    show it to the vendor when collecting your food.
                                  </p>
                                </div>

                                <Link to={`/food-orders/${ticket._id}`}>
                                  View Order
                                  <i className="bi bi-arrow-right"></i>
                                </Link>
                              </div>
                            </div>
                          </article>
                        );
                      }

                      if (

                        ticket.vibelyTicketType ===

                        "apartment"

                      ) {

                        const apartment =

                          ticket.apartment;



                        const booking =

                          ticket.booking;



                        const apartmentImage =

                          apartment?.images

                            ?.exterior ||

                          apartment?.images

                            ?.livingRoom ||

                          apartment?.images

                            ?.bedroom ||

                          apartment?.image ||

                          apartment?.imageUrl ||

                          concertImage;



                        const isSelected =

                          bookingFromUrl &&

                          (booking?._id ===

                            bookingFromUrl ||

                            ticket.booking ===

                            bookingFromUrl);



                        return (

                          <article

                            id={`apartment-ticket-${booking?._id || ticket._id}`}

                            className={`premium-ticket premium-ticket-${ticket.status} apartment-premium-ticket ${isSelected

                              ? "selected-vibely-ticket"

                              : ""

                              }`}

                            key={

                              ticket._id

                            }

                          >

                            <div className="premium-ticket-main">

                              <div className="premium-ticket-image">

                                <img

                                  src={

                                    apartmentImage

                                  }

                                  alt={

                                    apartment?.title ||

                                    "Vibely apartment"

                                  }

                                />



                                <div className="premium-image-overlay"></div>



                                <div className="premium-ticket-top">

                                  <div className="premium-brand">

                                    <img

                                      src={

                                        vibelyLogo

                                      }

                                      alt="Vibely"

                                    />



                                    <div>

                                      <strong>

                                        VIBELY

                                      </strong>



                                      <span>

                                        STAY PASS

                                      </span>

                                    </div>

                                  </div>



                                  <span

                                    className={`premium-status ${ticket.status}`}

                                  >

                                    <i

                                      className={getStatusIcon(

                                        ticket.status

                                      )}

                                    ></i>



                                    {formatStatus(

                                      ticket.status

                                    )}

                                  </span>

                                </div>



                                <div className="premium-image-content">

                                  <span className="premium-ticket-number">

                                    STAY PASS{" "}

                                    {String(

                                      index +

                                      1

                                    ).padStart(

                                      2,

                                      "0"

                                    )}

                                  </span>



                                  <span className="premium-ticket-category">

                                    {booking?.stayType ===

                                      "day_use"

                                      ? "DAY USE"

                                      : "OVERNIGHT"}

                                  </span>



                                  <h2>

                                    {apartment?.title ||

                                      "Vibely Apartment"}

                                  </h2>



                                  <p>

                                    Your stay.

                                    Your comfort.

                                    Your Vibely

                                    pass.

                                  </p>

                                </div>

                              </div>



                              <div className="premium-ticket-details">

                                <div className="premium-detail-heading">

                                  <div>

                                    <span>

                                      STAY

                                      INFORMATION

                                    </span>



                                    <h3>

                                      Your

                                      reservation

                                      details

                                    </h3>

                                  </div>



                                  <div className="premium-price">

                                    <span>

                                      TOTAL

                                      AMOUNT

                                    </span>



                                    <strong>

                                      {formatPrice(

                                        booking?.totalAmount

                                      )}

                                    </strong>

                                  </div>

                                </div>



                                <div className="premium-primary-details">

                                  <div className="premium-detail-item">

                                    <div className="premium-detail-icon">

                                      <i className="bi bi-calendar-check"></i>

                                    </div>



                                    <div>

                                      <span>

                                        CHECK-IN

                                      </span>



                                      <strong>

                                        {formatDate(

                                          booking?.checkInDate

                                        )}

                                      </strong>

                                    </div>

                                  </div>



                                  <div className="premium-detail-item">

                                    <div className="premium-detail-icon">

                                      <i className="bi bi-calendar-x"></i>

                                    </div>



                                    <div>

                                      <span>

                                        CHECK-OUT

                                      </span>



                                      <strong>

                                        {formatDate(

                                          booking?.checkOutDate

                                        )}

                                      </strong>

                                    </div>

                                  </div>



                                  <div className="premium-detail-item">

                                    <div className="premium-detail-icon">

                                      <i className="bi bi-geo-alt"></i>

                                    </div>



                                    <div>

                                      <span>

                                        LOCATION

                                      </span>



                                      <strong>

                                        {apartment?.location ||

                                          "Location unavailable"}

                                      </strong>

                                    </div>

                                  </div>



                                  <div className="premium-detail-item">

                                    <div className="premium-detail-icon">

                                      <i className="bi bi-clock"></i>

                                    </div>



                                    <div>

                                      <span>

                                        EXPECTED

                                        CHECK-IN

                                      </span>



                                      <strong>

                                        {booking?.expectedCheckInTime ||

                                          "—"}

                                      </strong>

                                    </div>

                                  </div>

                                </div>



                                <div className="premium-meta-grid">

                                  <div>

                                    <span>

                                      STAY TYPE

                                    </span>



                                    <strong>

                                      {booking?.stayType ===

                                        "day_use"

                                        ? "Day Use"

                                        : "Overnight"}

                                    </strong>

                                  </div>



                                  <div>

                                    <span>

                                      NUMBER OF

                                      UNITS

                                    </span>



                                    <strong>

                                      {booking?.numberOfUnits ||

                                        1}

                                    </strong>

                                  </div>



                                  <div>

                                    <span>

                                      BOOKING

                                      REFERENCE

                                    </span>



                                    <strong>

                                      {booking?.bookingReference ||

                                        "—"}

                                    </strong>

                                  </div>



                                  <div>

                                    <span>

                                      PASS STATUS

                                    </span>



                                    <strong>

                                      {formatStatus(

                                        ticket.status

                                      )}

                                    </strong>

                                  </div>

                                </div>



                                <div className="premium-ticket-code-mobile">

                                  <span>

                                    APARTMENT

                                    TICKET CODE

                                  </span>



                                  <strong>

                                    {ticket.ticketCode ||

                                      "—"}

                                  </strong>

                                </div>



                                <div className="premium-security-note">

                                  <i className="bi bi-shield-check"></i>



                                  <p>

                                    This stay

                                    pass belongs

                                    to your

                                    apartment

                                    booking. Keep

                                    your QR code

                                    and apartment

                                    ticket code

                                    private.

                                  </p>

                                </div>

                              </div>

                            </div>



                            <div className="premium-perforation">

                              <span></span>

                            </div>



                            <aside className="premium-ticket-stub">

                              <div className="premium-stub-header">

                                <span>

                                  STAY PASS

                                </span>



                                <div>

                                  <i className="bi bi-house-heart"></i>

                                </div>

                              </div>



                              <div className="premium-stub-event">

                                <span>

                                  {booking?.stayType ===

                                    "day_use"

                                    ? "DAY USE"

                                    : "OVERNIGHT"}

                                </span>



                                <strong>

                                  {apartment?.title ||

                                    "Vibely Stay"}

                                </strong>

                              </div>



                              <div className="premium-qr-area">

                                <span className="premium-scan-label">

                                  SCAN FOR

                                  CHECK-IN

                                </span>



                                <div className="premium-qr-frame">

                                  {ticket.qrCode &&

                                    ticket.status !==

                                    "cancelled" ? (

                                    <img

                                      src={

                                        ticket.qrCode

                                      }

                                      alt="Apartment ticket QR code"

                                    />

                                  ) : (

                                    <div className="premium-qr-unavailable">

                                      <i className="bi bi-qr-code"></i>



                                      <span>

                                        QR

                                        unavailable

                                      </span>

                                    </div>

                                  )}

                                </div>



                                <p>

                                  Present this

                                  pass when you

                                  arrive

                                </p>

                              </div>



                              <div className="premium-stub-code">

                                <span>

                                  APARTMENT

                                  TICKET CODE

                                </span>



                                <strong>

                                  {ticket.ticketCode ||

                                    "—"}

                                </strong>

                              </div>



                              <div className="premium-stub-footer">

                                <img

                                  src={

                                    vibelyLogo

                                  }

                                  alt="Vibely"

                                />



                                <div>

                                  <strong>

                                    VIBELY

                                  </strong>



                                  <span>

                                    DIGITAL STAY

                                    PASS

                                  </span>

                                </div>

                              </div>

                            </aside>

                          </article>

                        );

                      }



                      const event =

                        ticket.event;



                      const booking =

                        ticket.booking;



                      return (

                        <article

                          className={`premium-ticket premium-ticket-${ticket.status}`}

                          key={ticket._id}

                        >

                          <div className="premium-ticket-main">

                            <div className="premium-ticket-image">

                              <img

                                src={

                                  event?.image ||

                                  concertImage

                                }

                                alt={

                                  event?.title ||

                                  "Vibely event"

                                }

                              />



                              <div className="premium-image-overlay"></div>



                              <div className="premium-ticket-top">

                                <div className="premium-brand">

                                  <img

                                    src={

                                      vibelyLogo

                                    }

                                    alt="Vibely"

                                  />



                                  <div>

                                    <strong>

                                      VIBELY

                                    </strong>



                                    <span>

                                      EXPERIENCE

                                      PASS

                                    </span>

                                  </div>

                                </div>



                                <span

                                  className={`premium-status ${ticket.status}`}

                                >

                                  <i

                                    className={getStatusIcon(

                                      ticket.status

                                    )}

                                  ></i>



                                  {formatStatus(

                                    ticket.status

                                  )}

                                </span>

                              </div>



                              <div className="premium-image-content">

                                <span className="premium-ticket-number">

                                  TICKET{" "}

                                  {String(

                                    index + 1

                                  ).padStart(

                                    2,

                                    "0"

                                  )}

                                </span>



                                <span className="premium-ticket-category">

                                  {ticket.ticketType ||

                                    "REGULAR"}

                                </span>



                                <h2>

                                  {event?.title ||

                                    "Vibely Event"}

                                </h2>



                                <p>

                                  One ticket.

                                  One moment.

                                  One

                                  unforgettable

                                  vibe.

                                </p>

                              </div>

                            </div>



                            <div className="premium-ticket-details">

                              <div className="premium-detail-heading">

                                <div>

                                  <span>

                                    EVENT

                                    INFORMATION

                                  </span>



                                  <h3>

                                    Your entry

                                    details

                                  </h3>

                                </div>



                                <div className="premium-price">

                                  <span>

                                    TICKET VALUE

                                  </span>



                                  <strong>

                                    {formatPrice(

                                      ticket.ticketPrice ||

                                      event?.price

                                    )}

                                  </strong>

                                </div>

                              </div>



                              <div className="premium-primary-details">

                                <div className="premium-detail-item">

                                  <div className="premium-detail-icon">

                                    <i className="bi bi-calendar3"></i>

                                  </div>



                                  <div>

                                    <span>

                                      DATE & TIME

                                    </span>



                                    <strong>

                                      {formatEventDate(

                                        event?.date

                                      )}

                                    </strong>

                                  </div>

                                </div>



                                <div className="premium-detail-item">

                                  <div className="premium-detail-icon">

                                    <i className="bi bi-geo-alt"></i>

                                  </div>



                                  <div>

                                    <span>

                                      LOCATION

                                    </span>



                                    <strong>

                                      {event?.location ||

                                        "Venue details unavailable"}

                                    </strong>

                                  </div>

                                </div>

                              </div>



                              <div className="premium-meta-grid">

                                <div>

                                  <span>

                                    TICKET

                                    CATEGORY

                                  </span>



                                  <strong>

                                    {ticket.ticketType ||

                                      "Regular"}

                                  </strong>

                                </div>



                                <div>

                                  <span>

                                    BOOKING

                                    REFERENCE

                                  </span>



                                  <strong>

                                    {booking?.bookingReference ||

                                      "—"}

                                  </strong>

                                </div>



                                <div>

                                  <span>

                                    TICKET

                                    STATUS

                                  </span>



                                  <strong>

                                    {formatStatus(

                                      ticket.status

                                    )}

                                  </strong>

                                </div>

                              </div>



                              <div className="premium-ticket-code-mobile">

                                <span>

                                  UNIQUE TICKET

                                  CODE

                                </span>



                                <strong>

                                  {ticket.ticketCode ||

                                    "—"}

                                </strong>

                              </div>



                              <div className="premium-security-note">

                                <i className="bi bi-shield-check"></i>



                                <p>

                                  This ticket

                                  is unique to

                                  your booking.

                                  Do not share

                                  your QR code

                                  publicly.

                                </p>

                              </div>

                            </div>

                          </div>



                          <div className="premium-perforation">

                            <span></span>

                          </div>



                          <aside className="premium-ticket-stub">

                            <div className="premium-stub-header">

                              <span>

                                ADMIT ONE

                              </span>



                              <div>

                                <i className="bi bi-stars"></i>

                              </div>

                            </div>



                            <div className="premium-stub-event">

                              <span>

                                {ticket.ticketType ||

                                  "EVENT TICKET"}

                              </span>



                              <strong>

                                {event?.title ||

                                  "Vibely Event"}

                              </strong>

                            </div>



                            <div className="premium-qr-area">

                              <span className="premium-scan-label">

                                SCAN FOR ENTRY

                              </span>



                              <div className="premium-qr-frame">

                                {ticket.qrCode &&

                                  ticket.status !==

                                  "cancelled" ? (

                                  <img

                                    src={

                                      ticket.qrCode

                                    }

                                    alt="Ticket QR code"

                                  />

                                ) : (

                                  <div className="premium-qr-unavailable">

                                    <i className="bi bi-qr-code"></i>



                                    <span>

                                      QR

                                      unavailable

                                    </span>

                                  </div>

                                )}

                              </div>



                              <p>

                                Present this

                                code at the

                                entrance

                              </p>

                            </div>



                            <div className="premium-stub-code">

                              <span>

                                TICKET CODE

                              </span>



                              <strong>

                                {ticket.ticketCode ||

                                  "—"}

                              </strong>

                            </div>



                            <div className="premium-stub-footer">

                              <img

                                src={

                                  vibelyLogo

                                }

                                alt="Vibely"

                              />



                              <div>

                                <strong>

                                  VIBELY

                                </strong>



                                <span>

                                  DIGITAL

                                  EXPERIENCE

                                </span>

                              </div>

                            </div>

                          </aside>

                        </article>

                      );

                    }

                  )}

                </div>



                <div className="tickets-help-card">

                  <div className="tickets-help-icon">

                    <i className="bi bi-shield-check"></i>

                  </div>



                  <div>

                    <span>

                      BEFORE YOU GO

                    </span>



                    <h3>

                      Keep your pass private.

                    </h3>



                    <p>

                      Keep event and apartment QR

                      codes private. For food orders,

                      keep your pickup code private

                      until you collect your order.

                    </p>

                  </div>



                  <Link to="/profile">

                    Back to account

                    <i className="bi bi-arrow-right"></i>

                  </Link>

                </div>

              </>

            )}

        </section>

      </main>



      <DetailFooter />

    </>

  );

};



export default MyTickets;