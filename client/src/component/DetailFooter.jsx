import { Link } from "react-router-dom";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/detailFooter.css";

const DetailFooter = () => {
  return (
    <footer className="detail-footer">
      <div className="detail-footer-inner">
        <Link
          to="/"
          className="detail-footer-brand"
        >
          <img
            src={vibelyLogo}
            alt="Vibely"
          />

          <div>
            <h3>Vibely</h3>
            <span>
              EVENTS · APARTMENTS · FOOD
            </span>
          </div>
        </Link>

        <nav className="detail-footer-links">
          <Link to="/events">
            Events
          </Link>

          <Link to="/apartments">
            Apartments
          </Link>

          <Link to="/food">
            Food
          </Link>
        </nav>

        <div className="detail-footer-right">
          <p>
            © 2026 Vibely. All rights reserved.
          </p>

          <span>
            Lagos, Nigeria
          </span>
        </div>
      </div>
    </footer>
  );
};

export default DetailFooter;