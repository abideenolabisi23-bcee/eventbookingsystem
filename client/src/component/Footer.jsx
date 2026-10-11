import { Link } from "react-router-dom";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/footer.css";

const Footer = () => {
  return (
    <footer className="vibely-footer" id="contact">
      <div className="vibely-footer-brand-column">
        <Link to="/" className="vibely-footer-brand">
          <img src={vibelyLogo} alt="Vibely" />

          <div>
            <h2>Vibely</h2>
            <span>EVENTS · APARTMENTS · FOOD</span>
          </div>
        </Link>

        <p>
          Beautiful experiences,
          <br />
          all in one place.
        </p>

        <div className="vibely-social-links">
          <a href="#" aria-label="Instagram">
            IG
          </a>

          <a href="#" aria-label="X">
            X
          </a>

          <a href="#" aria-label="Facebook">
            FB
          </a>

          <a href="#" aria-label="TikTok">
            TK
          </a>
        </div>
      </div>

      <div className="vibely-footer-column">
        <h4>Explore</h4>

        <Link to="/events">
          Events
        </Link>

        <Link to="/apartments">
          Apartments
        </Link>

        <Link to="/food">
          Food
        </Link>
      </div>

      <div className="vibely-footer-column">
        <h4>Company</h4>

        <a href="/#about">
          About Us
        </a>

        <a href="/#contact">
          Contact
        </a>

        <a href="#">
          Careers
        </a>
      </div>

      <div className="vibely-footer-column">
        <h4>Support</h4>

        <a href="#">
          Help Center
        </a>

        <a href="#">
          FAQs
        </a>

        <a href="#">
          Terms & Conditions
        </a>

        <a href="#">
          Privacy Policy
        </a>
      </div>

      <div className="vibely-footer-column">
        <h4>Account</h4>

        <Link to="/login">
          Login
        </Link>

        <Link to="/signup">
          Create Account
        </Link>
      </div>

      <div className="vibely-footer-column">
        <h4>Partner With Vibely</h4>

        <Link to="/organizer/login">
          Organizer Login
        </Link>

        <Link to="/organizer/register">
          Become an Organizer
        </Link>
      </div>

      <div className="vibely-footer-column">
  <h4>Contact Us</h4>

  <p>Lagos, Nigeria</p>

  <a href="mailto:abideenolabisi23@gmail.com">
    <i className="bi bi-envelope"></i>
    {" "}abideenolabisi23@gmail.com
  </a>

  <a
    href="https://wa.me/2348157880215?text=Hello%20Vibely%2C%20I%20need%20assistance%20with%20a%20booking."
    target="_blank"
    rel="noopener noreferrer"
  >
    <i className="bi bi-whatsapp"></i>
    {" "}+234 8157880215
  </a>

  <p>Mon - Fri, 9:00 AM - 6:00 PM</p>
</div>
    </footer>
  );
};

export default Footer;