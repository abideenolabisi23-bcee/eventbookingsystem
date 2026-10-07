import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";

import vibelyLogo from "../assets/vibely-logo.png";
import concertImage from "../assets/concert.jpg";

import "../styles/profile.css";

const Profile = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [photoUploading, setPhotoUploading] =
    useState(false);

  const [photoMessage, setPhotoMessage] =
    useState("");

  const [photoError, setPhotoError] =
    useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const accessToken =
        localStorage.getItem("accessToken");

      if (!accessToken) {
        navigate("/login", {
          state: {
            returnTo: "/profile",
          },
        });

        return;
      }

      try {
        const config = {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        };

        const [
          profileResponse,
          ticketsResponse,
        ] = await Promise.all([
          axios.get(
            "https://eventbookingsystem-sooty.vercel.app/api/v1/profile",
            config
          ),

          axios.get(
            "https://eventbookingsystem-sooty.vercel.app/api/v1/tickets/my",
            config
          ),
        ]);

        const profileData =
          profileResponse.data.data;

        setUser(
          profileData?.user || profileData
        );

        setTickets(
          ticketsResponse.data.data || []
        );
      } catch (error) {
        console.log(
          "PROFILE ERROR:",
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
              returnTo: "/profile",
            },
          });

          return;
        }

        setError(
          error.response?.data?.message ||
          "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const getInitials = () => {
    if (!user) return "";

    const firstInitial =
      user.firstname
        ?.charAt(0)
        ?.toUpperCase() || "";

    const lastInitial =
      user.lastname
        ?.charAt(0)
        ?.toUpperCase() || "";

    return `${firstInitial}${lastInitial}`;
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Intl.DateTimeFormat(
      "en-NG",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    ).format(new Date(date));
  };

  const formatEventDate = (date) => {
    if (!date) return "Date unavailable";

    return new Intl.DateTimeFormat(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    ).format(new Date(date));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }
    ).format(price || 0);
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    navigate("/");
  };

  const openProfilePicturePicker = () => {
    setPhotoMessage("");
    setPhotoError("");

    document
      .getElementById(
        "profilePictureInput"
      )
      ?.click();
  };

  const handleProfilePicture = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setPhotoMessage("");
    setPhotoError("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(file.type)
    ) {
      setPhotoError(
        "Please select a JPG, PNG or WEBP image only."
      );

      event.target.value = "";

      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      setPhotoError(
        "Profile picture must not be more than 5MB."
      );

      event.target.value = "";

      return;
    }

    const accessToken =
      localStorage.getItem(
        "accessToken"
      );

    if (!accessToken) {
      navigate("/login", {
        state: {
          returnTo: "/profile",
        },
      });

      return;
    }

    try {
      setPhotoUploading(true);

      const formData =
        new FormData();

      formData.append(
        "profilePicture",
        file
      );

      const response =
        await axios.patch(
          "https://eventbookingsystem-sooty.vercel.app/api/v1/profile-picture",
          formData,
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          }
        );

      const profilePicture =
        response.data.data.profilePicture;

      setUser(
        (currentUser) => ({
          ...currentUser,
          profilePicture,
        })
      );

      setPhotoMessage(
        "Profile picture updated successfully."
      );

      window.dispatchEvent(
        new Event(
          "profilePictureUpdated"
        )
      );
    } catch (error) {
      console.log(
        "PROFILE PICTURE ERROR:",
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
            returnTo: "/profile",
          },
        });

        return;
      }

      setPhotoError(
        error.response?.data?.message ||
        "Unable to update profile picture."
      );
    } finally {
      setPhotoUploading(false);
      event.target.value = "";
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="profile-state-page">
          <div className="profile-loader"></div>

          <h2>
            Preparing your dashboard
          </h2>

          <p>
            Loading your Vibely account...
          </p>
        </main>

        <DetailFooter />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />

        <main className="profile-state-page">
          <div className="profile-error-icon">
            <i className="bi bi-exclamation-circle"></i>
          </div>

          <h2>
            We couldn't load your account
          </h2>

          <p>{error}</p>

          <Link
            to="/"
            className="profile-state-button"
          >
            Back to Home
          </Link>
        </main>

        <DetailFooter />
      </>
    );
  }

  if (!user) {
    return null;
  }

  const validTickets =
    tickets.filter(
      (ticket) =>
        ticket.status === "valid"
    );

  const upcomingTickets =
    tickets.filter(
      (ticket) =>
        ticket.status === "valid" &&
        ticket.event?.date &&
        new Date(
          ticket.event.date
        ) > new Date()
    );

  const bookingIds = new Set(
    tickets
      .map(
        (ticket) =>
          ticket.booking?._id
      )
      .filter(Boolean)
  );

  const recentTickets =
    tickets.slice(0, 3);

  return (
    <>
      <Navbar />

      <main className="profile-page">
        <section className="profile-cover">
          <div className="profile-cover-shape profile-cover-shape-one"></div>
          <div className="profile-cover-shape profile-cover-shape-two"></div>

          <div className="profile-cover-content">
            <span className="profile-cover-eyebrow">
              MY VIBELY
            </span>

            <h1>
              Your world,
              <br />
              <em>your way.</em>
            </h1>

            <p>
              Everything you book, enjoy and
              experience with Vibely lives
              right here.
            </p>
          </div>

          <div className="profile-cover-brand">
            <img
              src={vibelyLogo}
              alt="Vibely"
            />

            <div>
              <strong>Vibely</strong>

              <span>
                EVENTS · APARTMENTS · FOOD
              </span>
            </div>
          </div>
        </section>

        <section className="profile-dashboard">
          <aside className="profile-account-panel">
            <div className="profile-identity">
              <input
                type="file"
                id="profilePictureInput"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handleProfilePicture
                }
                hidden
              />

              <div className="profile-photo-area">
                {user.profilePicture ? (
                  <img
                    src={
                      user.profilePicture
                    }
                    alt={`${user.firstname} ${user.lastname}`}
                    className="profile-photo"
                  />
                ) : (
                  <div className="profile-photo profile-photo-initials">
                    {getInitials()}
                  </div>
                )}

                <button
                  type="button"
                  className="profile-camera"
                  onClick={
                    openProfilePicturePicker
                  }
                  disabled={
                    photoUploading
                  }
                  aria-label="Change profile picture"
                >
                  {photoUploading ? (
                    <span className="profile-mini-loader"></span>
                  ) : (
                    <i className="bi bi-camera-fill"></i>
                  )}
                </button>
              </div>

              <span className="profile-member-label">
                VIBELY MEMBER
              </span>

              <h2>
                {user.firstname}{" "}
                {user.lastname}
              </h2>

              <p>{user.email}</p>

              <button
                type="button"
                className="profile-change-photo"
                onClick={
                  openProfilePicturePicker
                }
                disabled={
                  photoUploading
                }
              >
                <i className="bi bi-camera"></i>

                {photoUploading
                  ? "Uploading..."
                  : "Update photo"}
              </button>

              {photoMessage && (
                <div className="profile-photo-success">
                  <i className="bi bi-check-circle-fill"></i>
                  {photoMessage}
                </div>
              )}

              {photoError && (
                <div className="profile-photo-error">
                  <i className="bi bi-exclamation-circle-fill"></i>
                  {photoError}
                </div>
              )}
            </div>

            <div className="profile-account-divider"></div>

            <nav className="profile-account-menu">
              <Link
                to="/profile"
                className="active"
              >
                <i className="bi bi-house-door"></i>

                <span>Overview</span>
              </Link>

              <Link to="/my-tickets">
                <i className="bi bi-ticket-perforated"></i>

                <span>My Tickets</span>
              </Link>

              <Link to="/my-bookings">
                <i className="bi bi-calendar-check"></i>

                <span>
                  Event Bookings
                </span>
              </Link>

              <Link to="/my-apartment-bookings">
                <i className="bi bi-building"></i>

                <span>
                  Apartment Bookings
                </span>
              </Link>

              <Link to="/my-food-orders">
                <i className="bi bi-bag-check"></i>

                <span>Food Orders</span>
              </Link>

              <Link to="/payments-refunds">
                <i className="bi bi-credit-card"></i>

                <span>
                  Payments & Refunds
                </span>
              </Link>

              <Link to="/change-password">
                <i className="bi bi-shield-lock"></i>

                <span>
                  Change Password
                </span>
              </Link>
            </nav>

            <div className="profile-account-divider"></div>

            <button
              type="button"
              className="profile-logout"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right"></i>

              Log out
            </button>
          </aside>

          <div className="profile-content">
            <section className="profile-welcome-card">
              <div className="profile-welcome-copy">
                <span>
                  GOOD TO SEE YOU
                </span>

                <h2>
                  Hi, {user.firstname}.
                  <br />
                  <em>
                    What’s your next vibe?
                  </em>
                </h2>

                <p>
                  Discover an event, book an
                  apartment or order something
                  delicious — your next
                  experience is only a few
                  clicks away.
                </p>

                <div className="profile-welcome-actions">
                  <Link
                    to="/events"
                    className="profile-primary-action"
                  >
                    Explore Events

                    <i className="bi bi-arrow-right"></i>
                  </Link>

                  <Link
                    to="/apartments"
                    className="profile-outline-action"
                  >
                    Apartments
                  </Link>

                  <Link
                    to="/food"
                    className="profile-outline-action"
                  >
                    Food
                  </Link>
                </div>
              </div>

              <div className="profile-welcome-mark">
                <div className="profile-logo-orbit">
                  <div>
                    <img
                      src={vibelyLogo}
                      alt=""
                    />
                  </div>
                </div>

                <span>
                  FIND YOUR VIBE
                </span>
              </div>
            </section>

            <section className="profile-dashboard-heading">
              <div>
                <span>
                  AT A GLANCE
                </span>

                <h2>
                  Your activity
                </h2>
              </div>

              <p>
                A quick look at your Vibely
                account.
              </p>
            </section>

            <section className="profile-stat-grid">
              <Link
                to="/my-tickets"
                className="profile-stat"
              >
                <div className="profile-stat-top">
                  <div className="profile-stat-icon">
                    <i className="bi bi-ticket-perforated"></i>
                  </div>

                  <i className="bi bi-arrow-up-right profile-stat-arrow"></i>
                </div>

                <strong>
                  {tickets.length}
                </strong>

                <h3>Event Tickets</h3>

                <p>
                  {validTickets.length} valid{" "}
                  {validTickets.length === 1
                    ? "ticket"
                    : "tickets"}
                </p>
              </Link>

              <Link
                to="/my-bookings"
                className="profile-stat"
              >
                <div className="profile-stat-top">
                  <div className="profile-stat-icon">
                    <i className="bi bi-calendar2-check"></i>
                  </div>

                  <i className="bi bi-arrow-up-right profile-stat-arrow"></i>
                </div>

                <strong>
                  {bookingIds.size}
                </strong>

                <h3>Event Bookings</h3>

                <p>
                  Your event reservations
                </p>
              </Link>

              <div className="profile-stat">
                <div className="profile-stat-top">
                  <div className="profile-stat-icon">
                    <i className="bi bi-stars"></i>
                  </div>

                  <i className="bi bi-sparkles profile-stat-arrow"></i>
                </div>

                <strong>
                  {upcomingTickets.length}
                </strong>

                <h3>Upcoming</h3>

                <p>
                  Experiences ahead
                </p>
              </div>
            </section>

            <section className="profile-services">
              <div className="profile-dashboard-heading">
                <div>
                  <span>
                    YOUR VIBELY
                  </span>

                  <h2>
                    Everything in one place
                  </h2>
                </div>

                <p>
                  Jump straight into the
                  activity you need.
                </p>
              </div>

              <div className="profile-services-grid">
                <Link
                  to="/my-tickets"
                  className="profile-service-card"
                >
                  <div className="profile-service-number">
                    01
                  </div>

                  <div className="profile-service-icon">
                    <i className="bi bi-ticket-perforated"></i>
                  </div>

                  <h3>My Tickets</h3>

                  <p>
                    View your individual event
                    tickets and ticket details.
                  </p>

                  <span>
                    Open tickets
                    <i className="bi bi-arrow-right"></i>
                  </span>
                </Link>

                <Link
                  to="/my-bookings"
                  className="profile-service-card"
                >
                  <div className="profile-service-number">
                    02
                  </div>

                  <div className="profile-service-icon">
                    <i className="bi bi-calendar-event"></i>
                  </div>

                  <h3>Event Bookings</h3>

                  <p>
                    See your event
                    reservations and booking
                    information.
                  </p>

                  <span>
                    View bookings
                    <i className="bi bi-arrow-right"></i>
                  </span>
                </Link>

                <Link
                  to="/my-apartment-bookings"
                  className="profile-service-card"
                >
                  <div className="profile-service-number">
                    03
                  </div>

                  <div className="profile-service-icon">
                    <i className="bi bi-building"></i>
                  </div>

                  <h3>
                    Apartment Bookings
                  </h3>

                  <p>
                    Manage your apartment
                    reservations and booking
                    details.
                  </p>

                  <span>
                    View apartments
                    <i className="bi bi-arrow-right"></i>
                  </span>
                </Link>

                <Link
                  to="/my-food-orders"
                  className="profile-service-card"
                >
                  <div className="profile-service-number">
                    04
                  </div>

                  <div className="profile-service-icon">
                    <i className="bi bi-bag-heart"></i>
                  </div>

                  <h3>Food Orders</h3>

                  <p>
                    Track your food orders,
                    payment and pickup
                    information.
                  </p>

                  <span>
                    View orders
                    <i className="bi bi-arrow-right"></i>
                  </span>
                </Link>
              </div>
            </section>

            <section className="profile-account-info">
              <div className="profile-account-info-heading">
                <div>
                  <span>
                    YOUR DETAILS
                  </span>

                  <h2>
                    Personal information
                  </h2>
                </div>

                <div className="profile-secure">
                  <i className="bi bi-shield-check"></i>

                  Secure account
                </div>
              </div>

              <div className="profile-info-grid">
                <div>
                  <span>
                    FIRST NAME
                  </span>

                  <strong>
                    {user.firstname}
                  </strong>
                </div>

                <div>
                  <span>
                    LAST NAME
                  </span>

                  <strong>
                    {user.lastname}
                  </strong>
                </div>

                <div>
                  <span>
                    EMAIL ADDRESS
                  </span>

                  <strong>
                    {user.email}
                  </strong>
                </div>

                <div>
                  <span>
                    MEMBER SINCE
                  </span>

                  <strong>
                    {formatDate(
                      user.createdAt
                    )}
                  </strong>
                </div>
              </div>

              <div className="profile-security-links">
                <Link to="/payments-refunds">
                  <div>
                    <i className="bi bi-credit-card"></i>

                    <div>
                      <strong>
                        Payments & Refunds
                      </strong>

                      <span>
                        View your transaction
                        activity
                      </span>
                    </div>
                  </div>

                  <i className="bi bi-chevron-right"></i>
                </Link>

                <Link to="/change-password">
                  <div>
                    <i className="bi bi-shield-lock"></i>

                    <div>
                      <strong>
                        Password & Security
                      </strong>

                      <span>
                        Keep your Vibely
                        account protected
                      </span>
                    </div>
                  </div>

                  <i className="bi bi-chevron-right"></i>
                </Link>
              </div>
            </section>

            <section className="profile-recent">
              <div className="profile-recent-heading">
                <div>
                  <span>
                    YOUR COLLECTION
                  </span>

                  <h2>
                    Recent tickets
                  </h2>
                </div>

                <Link to="/my-tickets">
                  View all

                  <i className="bi bi-arrow-right"></i>
                </Link>
              </div>

              {recentTickets.length === 0 ? (
                <div className="profile-empty">
                  <div className="profile-empty-icon">
                    <i className="bi bi-ticket-perforated"></i>
                  </div>

                  <span>
                    YOUR FIRST EXPERIENCE
                  </span>

                  <h3>
                    Your ticket collection
                    starts here.
                  </h3>

                  <p>
                    When you purchase an event
                    ticket, your latest tickets
                    will appear right here on
                    your profile.
                  </p>

                  <Link to="/events">
                    Explore Events

                    <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              ) : (
                <div className="profile-ticket-grid">
                  {recentTickets.map(
                    (ticket) => (
                      <article
                        className="profile-ticket-card"
                        key={ticket._id}
                      >
                        <div className="profile-ticket-image">
                          <img
                            src={
                              ticket.event
                                ?.image ||
                              concertImage
                            }
                            alt={
                              ticket.event
                                ?.title ||
                              "Vibely event"
                            }
                          />

                          <span
                            className={`profile-ticket-status ${ticket.status || ""}`}
                          >
                            {ticket.status ===
                              "refund_pending"
                              ? "REFUND PENDING"
                              : ticket.status
                                ?.replaceAll(
                                  "_",
                                  " "
                                )
                                ?.toUpperCase() ||
                              "VALID"}
                          </span>
                        </div>

                        <div className="profile-ticket-info">
                          <span className="profile-ticket-type">
                            {ticket.ticketType ||
                              "EVENT TICKET"}
                          </span>

                          <h3>
                            {ticket.event
                              ?.title ||
                              "Event"}
                          </h3>

                          <div className="profile-ticket-meta">
                            <p>
                              <i className="bi bi-calendar3"></i>

                              {formatEventDate(
                                ticket.event
                                  ?.date
                              )}
                            </p>

                            {ticket.event
                              ?.location && (
                                <p>
                                  <i className="bi bi-geo-alt"></i>

                                  {
                                    ticket.event
                                      .location
                                  }
                                </p>
                              )}
                          </div>

                          <div className="profile-ticket-bottom">
                            <strong>
                              {formatPrice(
                                ticket.ticketPrice ||
                                ticket.event
                                  ?.price
                              )}
                            </strong>

                            <Link to="/my-tickets">
                              View ticket

                              <i className="bi bi-arrow-right"></i>
                            </Link>
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>

      <DetailFooter />
    </>
  );
};

export default Profile;