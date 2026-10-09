
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import "../styles/vibelyTickets.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const getToken = () =>
  localStorage.getItem("userAccessToken");

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

const formatDate = (value, includeTime = false) => {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {})
  }).format(date);
};

const formatStayType = (value) =>
  value === "day_use"
    ? "Day Use"
    : value === "overnight"
      ? "Overnight Stay"
      : "Apartment Stay";

const formatStatus = (value) => {
  const labels = {
    valid: "Ready to use",
    used: "Checked in",
    confirmed: "Confirmed",
    pending: "Pending",
    paid: "Paid",
    cancelled: "Cancelled",
    refunded: "Refunded",
    partially_refunded: "Partially refunded",
    refund_pending: "Refund pending",
    checked_in: "Checked in",
    checked_out: "Checked out",
    upcoming: "Upcoming",
    failed: "Failed"
  };

  return labels[value] || String(value || "Unknown").replaceAll("_", " ");
};

const getLocation = (location) => {
  if (typeof location === "string") return location;

  if (location && typeof location === "object") {
    return [
      location.address,
      location.area,
      location.city,
      location.state
    ].filter(Boolean).join(", ") || "Location not specified";
  }

  return "Location not specified";
};

const getImage = (image) => {
  if (typeof image === "string") return image;

  if (Array.isArray(image)) {
    for (const value of image) {
      const found = getImage(value);
      if (found) return found;
    }
  }

  if (image && typeof image === "object") {
    if (image.secure_url || image.url || image.src) {
      return image.secure_url || image.url || image.src;
    }

    for (const value of Object.values(image)) {
      const found = getImage(value);
      if (found) return found;
    }
  }

  return "";
};

const getApartmentImages = (apartment) => {
  const fields = [
    ["exterior", "Exterior"],
    ["livingRoom", "Living Room"],
    ["bedroom", "Bedroom"],
    ["kitchen", "Kitchen"],
    ["bathroom", "Bathroom"],
    ["balcony", "Balcony"]
  ];

  return fields
    .map(([key, label]) => ({
      key,
      label,
      url: getImage(apartment?.images?.[key])
    }))
    .filter((image) => image.url);
};

const getBookingId = (booking) => {
  if (!booking) return "";
  if (typeof booking === "string") return booking;
  return String(booking._id || booking.id || "");
};

const getApartmentQr = (ticket) => {
  const qr = ticket?.qrCode;

  if (
    typeof qr === "string" &&
    (qr.startsWith("data:image/") || /^https:\/\//i.test(qr))
  ) {
    return qr;
  }

  return "";
};

const tabs = [
  { value: "all", label: "All Tickets" },
  { value: "events", label: "Events" },
  { value: "apartments", label: "Apartments" },
  { value: "food", label: "Food" }
];

export default function MyTickets() {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedType = searchParams.get("type");
  const requestedBooking = searchParams.get("booking");

  const activeTab = ["events", "apartments", "food"].includes(requestedType)
    ? requestedType
    : requestedType === "apartment"
      ? "apartments"
      : requestedType === "event"
        ? "events"
        : "all";

  const [eventTickets, setEventTickets] = useState([]);
  const [apartmentTickets, setApartmentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [failedSections, setFailedSections] = useState([]);

  const changeTab = (tab) => {
    setSearchParams(tab === "all" ? {} : { type: tab });
    setSelectedItem(null);
    setSearch("");
    setStatusFilter("all");
  };

  const fetchTickets = useCallback(async (signal) => {
    const token = getToken();

    if (!token) {
      setError("Please sign in to view your tickets.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setFailedSections([]);

    try {
      const headers = {
        Authorization: `Bearer ${token}`
      };

      const results = await Promise.allSettled([
        axios.get(`${API}/tickets/my`, { headers, signal }),
        axios.get(`${API}/apartment-tickets/my`, { headers, signal })
      ]);

      if (signal?.aborted) return;

      const failures = [];

      if (results[0].status === "fulfilled") {
        const result = results[0].value.data?.data;

        setEventTickets(
          Array.isArray(result)
            ? result
            : Array.isArray(result?.tickets)
              ? result.tickets
              : []
        );
      } else {
        setEventTickets([]);
        failures.push("event tickets");
      }

      if (results[1].status === "fulfilled") {
        const result = results[1].value.data?.data;

        setApartmentTickets(
          Array.isArray(result)
            ? result
            : Array.isArray(result?.tickets)
              ? result.tickets
              : []
        );
      } else {
        setApartmentTickets([]);
        failures.push("apartment tickets");
      }

      setFailedSections(failures);

      if (failures.length === 2) {
        setError("We couldn't load your tickets. Please try again.");
      }
    } catch (err) {
      if (axios.isCancel(err)) return;

      setError(
        err.response?.data?.message ||
        "We couldn't load your tickets right now."
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchTickets(controller.signal);
    return () => controller.abort();
  }, [fetchTickets]);

  const items = useMemo(() => {
    const events = eventTickets.map((ticket) => ({
      key: `event-${ticket._id || ticket.ticketCode}`,
      type: "events",
      date: ticket.createdAt || ticket.event?.date || "",
      status: ticket.status || "valid",
      title: ticket.event?.title || "Vibely Experience",
      location: getLocation(ticket.event?.location),
      reference: ticket.ticketCode || "",
      ticket
    }));

    const apartments = apartmentTickets.map((ticket) => {
      const booking = ticket.booking || {};
      const apartment = ticket.apartment || {};

      return {
        key: `apartment-${ticket._id || ticket.ticketCode}`,
        type: "apartments",
        date: ticket.createdAt || booking.checkInDate || "",
        status:
          ticket.status === "cancelled" ||
          booking.bookingStatus === "cancelled"
            ? "cancelled"
            : booking.stayStatus || ticket.status || "upcoming",
        title: apartment.title || "Apartment Reservation",
        location: getLocation(apartment.location),
        reference: ticket.ticketCode || "",
        ticket,
        booking
      };
    });

    return [...events, ...apartments].sort(
      (a, b) =>
        new Date(b.date || 0).getTime() -
        new Date(a.date || 0).getTime()
    );
  }, [eventTickets, apartmentTickets]);

  const counts = useMemo(
    () => ({
      all: items.length,
      events: items.filter((item) => item.type === "events").length,
      apartments: items.filter((item) => item.type === "apartments").length,
      food: 0
    }),
    [items]
  );

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab !== "all" && item.type !== activeTab) {
        return false;
      }

      if (
        requestedBooking &&
        activeTab === "apartments" &&
        getBookingId(item.booking) !== requestedBooking
      ) {
        return false;
      }

      const text = [
        item.title,
        item.location,
        item.reference,
        item.ticket?.ticketType,
        item.booking?.bookingReference,
        item.booking?.stayType
      ].filter(Boolean).join(" ").toLowerCase();

      if (!text.includes(search.trim().toLowerCase())) {
        return false;
      }

      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [items, activeTab, requestedBooking, search, statusFilter]);

  const downloadQR = (ticket) => {
    if (
      !ticket?.qrCode ||
      !ticket.qrCode.startsWith("data:image/png;base64,")
    ) {
      return;
    }

    const link = document.createElement("a");
    link.href = ticket.qrCode;
    link.download = `Vibely-${ticket.ticketCode}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const selectedEvent =
    selectedItem?.type === "events" ? selectedItem.ticket : null;

  const selectedApartmentTicket =
    selectedItem?.type === "apartments" ? selectedItem.ticket : null;

  const selectedApartment = selectedApartmentTicket?.apartment || {};
  const selectedBooking = selectedApartmentTicket?.booking || {};
  const selectedApartmentQr = getApartmentQr(selectedApartmentTicket);
  const selectedApartmentImages = getApartmentImages(selectedApartment);

  return (
    <main className="vtickets-page">
      <div className="vtickets-container">
        <header className="vtickets-heading">
          <Link to="/profile" className="vtickets-back-profile">
  <i className="bi bi-arrow-left"></i>
  Back to My Profile
</Link>
          <Link to="/" className="vtickets-logo">
            ✦ VIBELY
          </Link>

          <span className="vtickets-eyebrow">
            YOUR PERSONAL COLLECTION
          </span>

          <h1>
            Your tickets.
            <br />
            <em>Your moments.</em>
          </h1>

          <p>
            All your experiences, stays and reservations beautifully
            organized in one place.
          </p>
        </header>

        <nav className="vtickets-tabs" aria-label="Ticket categories">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`vtickets-tab ${
                activeTab === tab.value ? "active" : ""
              }`}
              onClick={() => changeTab(tab.value)}
              aria-pressed={activeTab === tab.value}
            >
              {tab.label}
              <span>{counts[tab.value]}</span>
            </button>
          ))}
        </nav>

        <div className="vtickets-count">
          <div>
            <span>MY COLLECTION</span>
            <strong>
              {visibleItems.length}{" "}
              {visibleItems.length === 1 ? "Pass" : "Passes"}
            </strong>
          </div>

          <div className="vtickets-controls">
            <input
              type="search"
              placeholder="Search tickets or bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="valid">Ready to use</option>
              <option value="used">Checked in</option>
              <option value="upcoming">Upcoming</option>
              <option value="checked_in">Checked in stay</option>
              <option value="checked_out">Checked out</option>
              <option value="refund_pending">Refund pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {!loading && failedSections.length === 1 && (
          <div className="vtickets-notice">
            Some information could not be loaded:{" "}
            {failedSections.join(", ")}.
            <button type="button" onClick={() => fetchTickets()}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="vtickets-empty">
            <span className="vtickets-loader" />
            <h2>Gathering your experiences...</h2>
          </div>
        ) : error ? (
          <div className="vtickets-empty">
            <span>♡</span>
            <h2>We couldn't load your collection</h2>
            <p>{error}</p>
            {getToken() ? (
              <button type="button" onClick={() => fetchTickets()}>
                Try again
              </button>
            ) : (
              <Link to="/login">Sign in</Link>
            )}
          </div>
        ) : activeTab === "food" ? (
          <div className="vtickets-empty">
            <span>✧</span>
            <h2>Food confirmations are coming next</h2>
            <p>
              Your Food tab is ready. We'll connect your food orders
              when we build the food ordering system.
            </p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="vtickets-empty">
            <span>✧</span>
            <h2>
              {requestedBooking && activeTab === "apartments"
                ? "Apartment pass unavailable"
                : search || statusFilter !== "all"
                  ? "No matching passes"
                  : "Your story starts here"}
            </h2>

            <p>
              {requestedBooking && activeTab === "apartments"
                ? "No apartment ticket was found for this booking. If payment was recently completed, refresh the page."
                : "Your available tickets will appear here."}
            </p>

            {requestedBooking && activeTab === "apartments" ? (
              <button
                type="button"
                onClick={() => changeTab("apartments")}
              >
                View all apartment passes
              </button>
            ) : (
              <Link to="/events">Explore events ↗</Link>
            )}
          </div>
        ) : (
          <div className="vtickets-grid">
            {visibleItems.map((item) => {
              if (item.type === "apartments") {
                const ticket = item.ticket;
                const booking = ticket.booking || {};
                const apartment = ticket.apartment || {};
                const apartmentQr = getApartmentQr(ticket);
                const apartmentImages = getApartmentImages(apartment);
                const image = apartmentImages[0]?.url || "";

                return (
                  <article key={item.key} className="vticket vticket-apartment">
  <div className="vstay-card">
    <div className="vstay-photo">
      {image ? (
        <img src={image} alt={item.title} loading="lazy" />
      ) : (
        <div className="vstay-photo-empty">
          <i className="bi bi-buildings"></i>
          <span>VIBELY STAYS</span>
        </div>
      )}

      <span className="vstay-photo-label">
        <i className="bi bi-stars"></i> VIBELY STAYS
      </span>
    </div>

    <div className="vstay-content">
      <div className="vstay-heading">
        <div>
          <span className="vstay-eyebrow">YOUR STAY RESERVATION</span>
          <h2>{item.title}</h2>
          <p>
            <i className="bi bi-geo-alt"></i> {item.location}
          </p>
        </div>

        <span className="vstay-type">
          {formatStayType(booking.stayType)}
        </span>
      </div>

      <div className="vstay-dates">
        <div>
          <small>CHECK-IN</small>
          <strong>{formatDate(booking.checkInDate)}</strong>
        </div>

        <div>
          <small>CHECK-OUT</small>
          <strong>{formatDate(booking.checkOutDate)}</strong>
        </div>
      </div>

      <div className="vstay-meta">
        <div>
          <small>STAY DETAILS</small>
          <strong>
            {booking.numberOfUnits || 1}{" "}
            {Number(booking.numberOfUnits) === 1 ? "unit" : "units"}
            {" · "}
            {booking.stayType === "day_use"
              ? "Day use"
              : `${booking.numberOfNights || 0} nights`}
          </strong>
        </div>

        <div>
          <small>TOTAL AMOUNT</small>
          <strong>{formatPrice(booking.totalAmount)}</strong>
        </div>

        <div>
          <small>STATUS</small>
          <strong>{formatStatus(item.status)}</strong>
        </div>
      </div>

      <div className="vstay-footer">
        <span className="vstay-reference">
          Ref: {booking.bookingReference || "—"}
        </span>

        <button
          type="button"
          className="vstay-details-btn"
          onClick={() => setSelectedItem(item)}
        >
          View Stay Details
          <i className="bi bi-arrow-up-right"></i>
        </button>
      </div>
    </div>

    <div className="vstay-qr-panel">
      <span className="vstay-qr-heading">YOUR STAY PASS</span>

      <div className="vstay-qr-image">
        {apartmentQr ? (
          <img
            src={apartmentQr}
            alt={`QR code for ${ticket.ticketCode}`}
          />
        ) : (
          <span>QR unavailable</span>
        )}
      </div>

      <small>TICKET CODE</small>
      <strong className="vstay-ticket-code">
        {ticket.ticketCode}
      </strong>
    </div>
  </div>
</article>
                );
              }

              const ticket = item.ticket;
              const event = ticket.event || {};
              const booking = ticket.booking || {};

              const eventImage = getImage(
  event.images ||
  event.image ||
  event.banner ||
  event.coverImage ||
  event.poster ||
  event.thumbnail
);
              return (
                <article key={item.key} className="vticket vticket-event">
                  <div className="vticket-top">
                    {eventImage && (
  <div className="vticket-event-photo">
    <img src={eventImage} alt={item.title} loading="lazy" />
  </div>
)}
                    <div className="vticket-topline">
                      <span className="vticket-brand">
                        <span>✦</span> VIBELY
                      </span>
                      <small>ADMIT ONE</small>
                    </div>

                    <span className="vticket-overline">
                      AN INVITATION TO
                    </span>

                    <h2>{item.title}</h2>

                    <span className="vticket-category">
                      ✧ {ticket.ticketType || "Event Ticket"}
                    </span>

                    <div className="vticket-details">
                      <div>
  <small>AMOUNT</small>
  <strong>{formatPrice(ticket.ticketPrice)}</strong>
</div>

<div>
  <small>STATUS</small>
  <strong>{formatStatus(ticket.status)}</strong>
</div>

{booking.bookingReference && (
  <div>
    <small>BOOKING REFERENCE</small>
    <strong>{booking.bookingReference}</strong>
  </div>
)}
                      <div>
                        <small>DATE & TIME</small>
                        <strong>{formatDate(event.date, true)}</strong>
                      </div>

                      <div>
                        <small>VENUE</small>
                        <strong>{item.location}</strong>
                      </div>
                    </div>

                     <button
                      type="button"
                      className="vticket-download"
                      onClick={() => setSelectedItem(item)}
                    >
                      View ticket details ↗
                    </button>
                  </div>

                  <div className="vticket-cut">
                    <span />
                    <div />
                    <span />
                  </div>

                  <div className="vticket-bottom">
                    
                   <div className="vticket-qr-area">
  {ticket.qrCode ? (
    <img
      src={ticket.qrCode}
      alt={`QR code for ${ticket.ticketCode}`}
      className="vticket-bold-qr"
    />
  ) : (
    <div className="vticket-no-qr">
      QR unavailable
    </div>
  )}

  <div className="vticket-qr-code">
    <small>TICKET CODE</small>
    <strong>{ticket.ticketCode}</strong>
  </div>
</div>

                   

                    {booking.bookingReference && (
                      <p className="vticket-booking-ref">
                        Booking: {booking.bookingReference}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="vtickets-bottom-banner">
          <div>
            <span>MORE MAGIC AWAITS</span>
            <h2>
              The best memories
              <br />
              <em>are still ahead.</em>
            </h2>
          </div>

          <Link to="/events">Discover events ↗</Link>
        </div>
      </div>

      {selectedItem && (
        <div
          className="vtickets-modal-backdrop"
          onClick={() => setSelectedItem(null)}
        >
          <section
            className="vtickets-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Ticket details"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="vtickets-modal-close"
              onClick={() => setSelectedItem(null)}
              aria-label="Close details"
            >
              ×
            </button>

            <div className="vtickets-modal-brand">
              ✦ VIBELY
            </div>

            <span className="vtickets-eyebrow">
              {selectedApartmentTicket
                ? "YOUR STAY CONFIRMATION"
                : "YOUR DIGITAL INVITATION"}
            </span>

            <h2>
              {selectedApartmentTicket
                ? selectedApartment.title || "Apartment Reservation"
                : selectedEvent?.event?.title || "Vibely Experience"}
            </h2>

            {selectedEvent && (
              <>
                {selectedEvent.qrCode ? (
                  <img
                    src={selectedEvent.qrCode}
                    alt="Event ticket QR code"
                    className="vtickets-modal-qr"
                  />
                ) : (
                  <p>QR code unavailable.</p>
                )}

                <p className="vtickets-modal-code">
                  {selectedEvent.ticketCode}
                </p>

                <div className="vtickets-modal-details">
                  <p>
                    <span>Category</span>
                    <strong>
                      {selectedEvent.ticketType || "Event Ticket"}
                    </strong>
                  </p>

                  <p>
                    <span>Date</span>
                    <strong>
                      {formatDate(selectedEvent.event?.date, true)}
                    </strong>
                  </p>

                  <p>
                    <span>Venue</span>
                    <strong>
                      {getLocation(selectedEvent.event?.location)}
                    </strong>
                  </p>

                  <p>
                    <span>Status</span>
                    <strong>{formatStatus(selectedEvent.status)}</strong>
                  </p>
                </div>

                {selectedEvent.qrCode?.startsWith(
                  "data:image/png;base64,"
                ) && (
                  <button
                    type="button"
                    className="vtickets-modal-action"
                    onClick={() => downloadQR(selectedEvent)}
                  >
                    Download QR code ↓
                  </button>
                )}
              </>
            )}

            {selectedApartmentTicket && (
              <>
                {selectedApartmentQr ? (
                  <img
                    src={selectedApartmentQr}
                    alt={`Apartment QR code ${selectedApartmentTicket.ticketCode}`}
                    className="vtickets-modal-qr"
                  />
                ) : (
                  <p>Apartment QR code unavailable.</p>
                )}

                <p className="vtickets-modal-code">
                  {selectedApartmentTicket.ticketCode}
                </p>

                <div className="vtickets-modal-details">
                  <p>
                    <span>Ticket status</span>
                    <strong>
                      {formatStatus(selectedApartmentTicket.status)}
                    </strong>
                  </p>

                  <p>
                    <span>Booking reference</span>
                    <strong>
                      {selectedBooking.bookingReference || "—"}
                    </strong>
                  </p>

                  <p>
                    <span>Apartment type</span>
                    <strong>
                      {selectedApartment.apartmentType || "—"}
                    </strong>
                  </p>

                  <p>
                    <span>Location</span>
                    <strong>
                      {getLocation(selectedApartment.location)}
                    </strong>
                  </p>

                  <p>
                    <span>Check-in</span>
                    <strong>
                      {formatDate(selectedBooking.checkInDate)}
                    </strong>
                  </p>

                  <p>
                    <span>Check-out</span>
                    <strong>
                      {formatDate(selectedBooking.checkOutDate)}
                    </strong>
                  </p>

                  <p>
                    <span>Stay type</span>
                    <strong>
                      {formatStayType(selectedBooking.stayType)}
                    </strong>
                  </p>

                  <p>
                    <span>Expected arrival</span>
                    <strong>
                      {selectedBooking.expectedCheckInTime ||
                        "Not specified"}
                    </strong>
                  </p>

                  <p>
                    <span>Units</span>
                    <strong>
                      {selectedBooking.numberOfUnits || 1}
                    </strong>
                  </p>

                  <p>
                    <span>Nights</span>
                    <strong>
                      {selectedBooking.stayType === "day_use"
                        ? "Day use"
                        : selectedBooking.numberOfNights || 0}
                    </strong>
                  </p>

                  <p>
                    <span>Booking status</span>
                    <strong>
                      {formatStatus(selectedBooking.bookingStatus)}
                    </strong>
                  </p>

                  <p>
                    <span>Payment</span>
                    <strong>
                      {formatStatus(selectedBooking.paymentStatus)}
                    </strong>
                  </p>

                  <p>
                    <span>Stay status</span>
                    <strong>
                      {formatStatus(selectedBooking.stayStatus)}
                    </strong>
                  </p>

                  <p>
                    <span>Total paid</span>
                    <strong>
                      {formatPrice(selectedBooking.totalAmount)}
                    </strong>
                  </p>
                </div>

                <div className="vtickets-apartment-gallery">
                  <h3>Explore your apartment</h3>

                  {selectedApartmentImages.length ? (
                    <div className="vtickets-apartment-gallery-grid">
                      {selectedApartmentImages.map((image) => (
                        <div
                          className="vtickets-apartment-gallery-item"
                          key={image.key}
                        >
                          <img src={image.url} alt={image.label} />
                          <span>{image.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Apartment pictures are unavailable.</p>
                  )}
                </div>

                {selectedApartmentTicket.qrCode?.startsWith(
                  "data:image/png;base64,"
                ) && (
                  <button
                    type="button"
                    className="vtickets-modal-action"
                    onClick={() => downloadQR(selectedApartmentTicket)}
                  >
                    Download apartment QR code ↓
                  </button>
                )}

                <p className="vtickets-modal-note">
                  Present your apartment QR code or ticket code
                  to the organizer during check-in.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
