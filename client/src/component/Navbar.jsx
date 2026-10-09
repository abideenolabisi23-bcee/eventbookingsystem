import {
  Link,
  NavLink,
  useLocation,
} from "react-router-dom";

import AccountMenu from "./AccountMenu";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/navbar.css";

const Navbar = () => {
  const location = useLocation();

  const accessToken =
    localStorage.getItem("userAccessToken");

  const isHomePage =
    location.pathname === "/";

  return (
    <header className="vibely-navbar">
      <Link
        to="/"
        className="vibely-navbar-brand"
      >
        <img
          src={vibelyLogo}
          alt="Vibely"
        />

        <div>
          <h2>Vibely</h2>

          <span>
            EVENTS · APARTMENTS · FOOD
          </span>
        </div>
      </Link>

      <nav className="vibely-navbar-links">
  <NavLink
    to="/"
    end
    className={({ isActive }) =>
      isActive ? "active" : ""
    }
  >
    Home
  </NavLink>

  <NavLink
    to="/events"
    className={({ isActive }) =>
      isActive ? "active" : ""
    }
  >
    Events
  </NavLink>

  <NavLink
    to="/apartments"
    className={({ isActive }) =>
      isActive ? "active" : ""
    }
  >
    Apartments
  </NavLink>

  <NavLink
    to="/food"
    className={({ isActive }) =>
      isActive ? "active" : ""
    }
  >
    Food
  </NavLink>

  {isHomePage && (
    <>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
    </>
  )}
</nav>

      <div className="vibely-navbar-actions">
        {accessToken ? (
          <AccountMenu />
        ) : (
          <>
            <Link
              to="/login"
              className="vibely-login-link"
            >
              Login
            </Link>

            <Link
              to="/signup"
              className="vibely-signup-link"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;