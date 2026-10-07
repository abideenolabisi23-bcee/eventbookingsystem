import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Building2,
  QrCode,
  ScanLine,
  ShieldCheck,
  LogOut
} from "lucide-react";
import "../styles/organizerCheckIn.css";
import vibelyLogo from "../assets/vibely-logo.png";

const OrganizerCheckIn = () => {
  const navigate = useNavigate();

  const firstname =
    localStorage.getItem("firstname") || "Organizer";

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    localStorage.removeItem("firstname");
    localStorage.removeItem("lastname");

    navigate("/organizer/login");
  };

  return (
    <div className="organizer-checkin-page">
      <aside className="organizer-checkin-sidebar">
        <div
          className="organizer-checkin-logo"
          onClick={() => navigate("/organizer/dashboard")}
        >
          <img src={vibelyLogo} alt="Vibely" />
        </div>

        <div className="organizer-checkin-sidebar-content">
          <div className="organizer-checkin-menu-section">
            <p className="organizer-checkin-menu-label">
              OVERVIEW
            </p>

            <button
              className="organizer-checkin-menu-item"
              onClick={() =>
                navigate("/organizer/dashboard")
              }
            >
              <i className="bi bi-grid"></i>
              <span>Dashboard</span>
            </button>
          </div>

          <div className="organizer-checkin-menu-section">
            <p className="organizer-checkin-menu-label">
              MANAGEMENT
            </p>

            <button
              className="organizer-checkin-menu-item"
              onClick={() =>
                navigate("/organizer/events")
              }
            >
              <i className="bi bi-calendar-event"></i>
              <span>Events</span>
            </button>

            <button
              className="organizer-checkin-menu-item"
              onClick={() =>
                navigate("/organizer/apartments")
              }
            >
              <i className="bi bi-building"></i>
              <span>Apartments</span>
            </button>
          </div>

          <div className="organizer-checkin-menu-section">
            <p className="organizer-checkin-menu-label">
              EVENT OPERATIONS
            </p>

            <button
              className="organizer-checkin-menu-item"
              onClick={() =>
                navigate("/organizer/events")
              }
            >
              <i className="bi bi-people"></i>
              <span>Bookings & Attendees</span>
            </button>

            <button
              className="organizer-checkin-menu-item"
              onClick={() =>
                navigate("/organizer/events")
              }
            >
              <i className="bi bi-person-badge"></i>
              <span>Event Staff</span>
            </button>

            <button className="organizer-checkin-menu-item active">
              <i className="bi bi-qr-code-scan"></i>
              <span>QR Check-In</span>
            </button>
          </div>

          <div className="organizer-checkin-menu-section">
            <p className="organizer-checkin-menu-label">
              ACCOUNT
            </p>

            <button
              className="organizer-checkin-menu-item"
              onClick={() =>
                navigate("/organizer/profile")
              }
            >
              <i className="bi bi-person"></i>
              <span>Profile & Settings</span>
            </button>
          </div>
        </div>

        <button
          className="organizer-checkin-logout"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="organizer-checkin-main">
        <div className="organizer-checkin-topbar">
          <button
            className="organizer-checkin-back"
            onClick={() =>
              navigate("/organizer/dashboard")
            }
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div className="organizer-checkin-user">
            <div className="organizer-checkin-avatar">
              {firstname.charAt(0).toUpperCase()}
            </div>

            <div>
              <span className="organizer-checkin-user-name">
                {firstname}
              </span>
              <span className="organizer-checkin-user-role">
                Organizer
              </span>
            </div>
          </div>
        </div>

        <section className="organizer-checkin-hero">
          <div className="organizer-checkin-hero-icon">
            <QrCode size={30} />
          </div>

          <div>
            <p className="organizer-checkin-eyebrow">
              VIBELY CHECK-IN
            </p>

            <h1>QR Check-In Center</h1>

            <p>
              Scan and verify guests for your events and
              apartment bookings from one secure place.
            </p>
          </div>
        </section>

        <section className="organizer-checkin-security">
          <ShieldCheck size={21} />

          <div>
            <strong>Secure organizer verification</strong>
            <p>
              Only tickets belonging to events or apartments
              owned by your organizer account can be
              validated.
            </p>
          </div>
        </section>

        <div className="organizer-checkin-section-heading">
          <p>SELECT A CHECK-IN TYPE</p>
          <h2>What would you like to scan?</h2>
        </div>

        <section className="organizer-checkin-options">
          <article className="organizer-checkin-card event-card">
            <div className="organizer-checkin-card-top">
              <div className="organizer-checkin-card-icon">
                <CalendarDays size={29} />
              </div>

              <span className="organizer-checkin-card-tag">
                EVENTS
              </span>
            </div>

            <div className="organizer-checkin-card-content">
              <h3>Event Check-In</h3>

              <p>
                Use one scanner for tickets from every event
                created under your organizer account.
              </p>

              <div className="organizer-checkin-feature">
                <ScanLine size={18} />
                <span>
                  Scan any of your event QR tickets
                </span>
              </div>

              <div className="organizer-checkin-feature">
                <CalendarDays size={18} />
                <span>
                  Event details are identified automatically
                </span>
              </div>

              <div className="organizer-checkin-feature">
                <ShieldCheck size={18} />
                <span>
                  Tickets from other organizers are rejected
                </span>
              </div>
            </div>

            <button
              className="organizer-checkin-open-button"
              onClick={() =>
                navigate("/organizer/check-in/events")
              }
            >
              <QrCode size={19} />
              Open Event Scanner
            </button>
          </article>

          <article className="organizer-checkin-card apartment-card">
            <div className="organizer-checkin-card-top">
              <div className="organizer-checkin-card-icon">
                <Building2 size={29} />
              </div>

              <span className="organizer-checkin-card-tag">
                APARTMENTS
              </span>
            </div>

            <div className="organizer-checkin-card-content">
              <h3>Apartment Check-In</h3>

              <p>
                Use one scanner for every apartment category
                created under your organizer account.
              </p>

              <div className="organizer-checkin-feature">
                <ScanLine size={18} />
                <span>
                  Scan any apartment booking QR ticket
                </span>
              </div>

              <div className="organizer-checkin-feature">
                <Building2 size={18} />
                <span>
                  Budget, Standard or Luxury is detected
                  automatically
                </span>
              </div>

              <div className="organizer-checkin-feature">
                <ShieldCheck size={18} />
                <span>
                  Only your own apartment tickets are accepted
                </span>
              </div>
            </div>

            <button
              className="organizer-checkin-open-button"
              onClick={() =>
                navigate("/organizer/check-in/apartments")
              }
            >
              <QrCode size={19} />
              Open Apartment Scanner
            </button>
          </article>
        </section>
      </main>
    </div>
  );
};

export default OrganizerCheckIn;