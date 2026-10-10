import { Link, useLocation, useNavigate } from "react-router-dom";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/organizerAccountStatus.css";

const statusContent = {
  pending: {
    eyebrow: "APPLICATION UNDER REVIEW",
    badge: "Awaiting approval",
    icon: "bi-hourglass-split",
    title: "Something beautiful",
    highlight: "is in the making.",
    description:
      "Your organizer application has been received. Our team is reviewing your details before welcoming you into Vibely Organizer Studio.",
    noticeTitle: "Your application is being reviewed",
    notice:
      "You don't need to submit another application. Once your account is approved, you'll be able to sign in and access your organizer dashboard.",
    steps: [
      {
        title: "Application submitted",
        description: "Your registration details have been received.",
        state: "complete"
      },
      {
        title: "Admin review",
        description: "Your organizer application is being reviewed.",
        state: "active"
      },
      {
        title: "Start creating",
        description: "Access your dashboard once approved.",
        state: "upcoming"
      }
    ],
    primaryText: "Back to Organizer Login",
    primaryLink: "/organizer/login"
  },

  rejected: {
    eyebrow: "APPLICATION UPDATE",
    badge: "Application not approved",
    icon: "bi-file-earmark-x",
    title: "Your journey",
    highlight: "isn't over.",
    description:
      "Unfortunately, your organizer application was not approved at this time. We understand this may be disappointing.",
    noticeTitle: "About your application",
    notice:
      "Your application was not approved. If you believe this was a mistake or need clarification, please contact the Vibely support team.",
    steps: [
      {
        title: "Application submitted",
        description: "Your registration details were received.",
        state: "complete"
      },
      {
        title: "Application reviewed",
        description: "The review process has been completed.",
        state: "complete"
      },
      {
        title: "Application not approved",
        description: "Contact support if you need assistance.",
        state: "rejected"
      }
    ],
    primaryText: "Return to Organizer Portal",
    primaryLink: "/organizer"
  },

  suspended: {
    eyebrow: "ACCOUNT ACCESS UPDATE",
    badge: "Account suspended",
    icon: "bi-shield-exclamation",
    title: "Your workspace",
    highlight: "is temporarily unavailable.",
    description:
      "Access to your Vibely Organizer Studio account is currently restricted. Your dashboard and organizer management tools are unavailable.",
    noticeTitle: "Your account needs attention",
    notice:
      "Please contact Vibely support for information about your account status and the steps required to restore access.",
    steps: [
      {
        title: "Organizer account created",
        description: "Your organizer profile was established.",
        state: "complete"
      },
      {
        title: "Access restricted",
        description: "Your account is currently suspended.",
        state: "rejected"
      },
      {
        title: "Account review",
        description: "Contact support for further assistance.",
        state: "upcoming"
      }
    ],
    primaryText: "Return to Organizer Portal",
    primaryLink: "/organizer"
  }
};

const OrganizerAccountStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const status = location.pathname.includes("/rejected")
    ? "rejected"
    : location.pathname.includes("/suspended")
    ? "suspended"
    : "pending";

  const content = statusContent[status];

  return (
    <main className={`organizer-status-page organizer-status-${status}`}>
      <div className="organizer-status-glow organizer-status-glow-one" />
      <div className="organizer-status-glow organizer-status-glow-two" />

      <header className="organizer-status-header">
        <Link to="/" className="organizer-status-brand">
          <img src={vibelyLogo} alt="Vibely logo" />

          <div>
            <strong>Vibely.</strong>
            <span>ORGANIZER STUDIO</span>
          </div>
        </Link>

        <Link to="/" className="organizer-status-home">
          <i className="bi bi-house-door" />
          <span>Back to Vibely</span>
        </Link>
      </header>

      <div className="organizer-status-layout">
        <section className="organizer-status-intro">
          <div className="organizer-status-eyebrow">
            <span className="organizer-status-eyebrow-line" />
            {content.eyebrow}
          </div>

          <div className="organizer-status-icon-wrap">
            <div className="organizer-status-icon-ring">
              <div className="organizer-status-icon">
                <i className={`bi ${content.icon}`} />
              </div>
            </div>
          </div>

          <h1>
            {content.title}
            <span>{content.highlight}</span>
          </h1>

          <p>{content.description}</p>

          <div className="organizer-status-message">
            <div className="organizer-status-message-icon">
              <i className="bi bi-info-circle" />
            </div>

            <div>
              <strong>{content.noticeTitle}</strong>
              <p>{content.notice}</p>
            </div>
          </div>

          <div className="organizer-status-actions">
            <Link
              to={content.primaryLink}
              className="organizer-status-primary"
            >
              {content.primaryText}
              <i className="bi bi-arrow-up-right" />
            </Link>

            <button
              type="button"
              className="organizer-status-secondary"
              onClick={() => navigate("/")}
            >
              Explore Vibely
              <i className="bi bi-arrow-right" />
            </button>
          </div>
        </section>

        <aside className="organizer-status-side">
          <div className="organizer-status-card">
            <div className="organizer-status-card-top">
              <div>
                <span>VIBELY ORGANIZER STUDIO</span>
                <h2>Application overview</h2>
              </div>

              <div className="organizer-status-card-icon">
                <i className="bi bi-stars" />
              </div>
            </div>

            <div className={`organizer-status-badge organizer-status-badge-${status}`}>
              <span className="organizer-status-badge-dot" />
              {content.badge}
            </div>

            <div className="organizer-status-timeline">
              {content.steps.map((step, index) => (
                <div
                  className={`organizer-status-step organizer-status-step-${step.state}`}
                  key={step.title}
                >
                  <div className="organizer-status-step-marker">
                    {step.state === "complete" ? (
                      <i className="bi bi-check-lg" />
                    ) : step.state === "rejected" ? (
                      <i className="bi bi-x-lg" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  <div className="organizer-status-step-copy">
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="organizer-status-card-footer">
              <i className="bi bi-shield-check" />
              <span>
                Your organizer account is subject to Vibely's
                account review and access requirements.
              </span>
            </div>
          </div>

          <div className="organizer-status-help">
            <div className="organizer-status-help-icon">
              <i className="bi bi-headset" />
            </div>

            <div>
              <strong>Need some assistance?</strong>
              <p>
                Visit the organizer portal for information
                about managing your Vibely account.
              </p>
            </div>

            <Link to="/organizer" aria-label="Visit organizer portal">
              <i className="bi bi-arrow-up-right" />
            </Link>
          </div>
        </aside>
      </div>

      <footer className="organizer-status-footer">
        <span>© {new Date().getFullYear()} Vibely Organizer Studio</span>
        <span>Beautiful experiences begin here.</span>
      </footer>
    </main>
  );
};

export default OrganizerAccountStatus;