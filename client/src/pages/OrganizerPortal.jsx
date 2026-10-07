import { useNavigate } from "react-router-dom";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/organizerPortal.css";

const OrganizerPortal = () => {
  const navigate = useNavigate();

  return (
    <div className="organizer-portal">
      <nav className="organizer-portal-nav">
        <div
  className="organizer-portal-logo"
  onClick={() => navigate("/organizer")}
>
  <img
    src={vibelyLogo}
    alt="Vibely"
    className="organizer-vibely-logo"
  />

  <div className="organizer-vibely-brand">
    <h2>Vibely</h2>
    <span>ORGANIZER PORTAL</span>
  </div>
</div>

        <button
          className="organizer-portal-login-nav"
          onClick={() => navigate("/organizer/login")}
        >
          Sign In
        </button>
      </nav>

      <main className="organizer-portal-main">
        <section className="organizer-portal-hero">
          <div className="organizer-portal-badge">
            <i className="bi bi-stars"></i>
            VIBELY ORGANIZER PORTAL
          </div>

          <h1>
            Create experiences.
            <span> Manage them beautifully.</span>
          </h1>

          <p className="organizer-portal-description">
            Your private workspace for creating events, managing bookings,
            coordinating staff, checking in guests and growing your business
            with Vibely.
          </p>

          <div className="organizer-portal-actions">
            <button
              className="organizer-primary-button"
              onClick={() => navigate("/organizer/login")}
            >
              Sign in to Organizer Portal
              <i className="bi bi-arrow-right"></i>
            </button>

            <button
              className="organizer-secondary-button"
              onClick={() => navigate("/organizer/register")}
            >
              Apply as an Organizer
            </button>
          </div>

          <div className="organizer-portal-note">
            <i className="bi bi-shield-check"></i>

            <p>
              Organizer accounts are reviewed and approved before access to
              management tools is granted.
            </p>
          </div>
        </section>

        <section className="organizer-portal-preview">
          <div className="preview-decoration preview-decoration-one"></div>
          <div className="preview-decoration preview-decoration-two"></div>

          <div className="preview-card">
            <div className="preview-card-top">
              <div>
                <span>ORGANIZER WORKSPACE</span>
                <h3>Everything in one place.</h3>
              </div>

              <div className="preview-profile">
                <i className="bi bi-person"></i>
              </div>
            </div>

            <div className="preview-stats">
              <div className="preview-stat">
                <div className="preview-icon">
                  <i className="bi bi-calendar-event"></i>
                </div>

                <div>
                  <strong>Events</strong>
                  <span>Create & manage</span>
                </div>
              </div>

              <div className="preview-stat">
                <div className="preview-icon">
                  <i className="bi bi-ticket-perforated"></i>
                </div>

                <div>
                  <strong>Bookings</strong>
                  <span>Track attendees</span>
                </div>
              </div>

              <div className="preview-stat">
                <div className="preview-icon">
                  <i className="bi bi-people"></i>
                </div>

                <div>
                  <strong>Staff</strong>
                  <span>Manage your team</span>
                </div>
              </div>

              <div className="preview-stat">
                <div className="preview-icon">
                  <i className="bi bi-qr-code-scan"></i>
                </div>

                <div>
                  <strong>Check-in</strong>
                  <span>Scan tickets</span>
                </div>
              </div>
            </div>

            <div className="preview-bottom">
              <div className="preview-bottom-icon">
                <i className="bi bi-graph-up-arrow"></i>
              </div>

              <div>
                <span>YOUR BUSINESS</span>
                <h4>Manage. Track. Grow.</h4>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="organizer-portal-footer">
        <p>© 2026 Vibely. Organizer Portal.</p>

        <button onClick={() => navigate("/")}>
          <i className="bi bi-arrow-left"></i>
          Return to Vibely
        </button>
      </footer>
    </div>
  );
};

export default OrganizerPortal;