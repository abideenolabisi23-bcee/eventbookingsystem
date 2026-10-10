import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  useLocation
} from "react-router-dom";

import AccountMenu from "./AccountMenu";
import vibelyLogo from "../assets/vibely-logo.png";
import { getFoodCartCount } from "../utils/foodCart";
import "../styles/navbar.css";

const Navbar = () => {
  const location = useLocation();
  const [cartCount, setCartCount] = useState(() => getFoodCartCount());

  const accessToken = localStorage.getItem("userAccessToken");
  const isHomePage = location.pathname === "/";

 useEffect(() => {
  const updateCartCount = () => {
    setCartCount(getFoodCartCount());
  };

  updateCartCount();

  window.addEventListener("storage", updateCartCount);
  window.addEventListener("focus", updateCartCount);
  window.addEventListener("vibely-cart-updated", updateCartCount);

  return () => {
    window.removeEventListener("storage", updateCartCount);
    window.removeEventListener("focus", updateCartCount);
    window.removeEventListener("vibely-cart-updated", updateCartCount);
  };
}, [location.pathname]);

  return (
    <header className="vibely-navbar">
      <Link to="/" className="vibely-navbar-brand">
        <img src={vibelyLogo} alt="Vibely" />

        <div>
          <h2>Vibely</h2>
          <span>EVENTS · APARTMENTS · FOOD</span>
        </div>
      </Link>

      <nav className="vibely-navbar-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => isActive ? "active" : ""}
        >
          Home
        </NavLink>

        <NavLink
          to="/events"
          className={({ isActive }) => isActive ? "active" : ""}
        >
          Events
        </NavLink>

        <NavLink
          to="/apartments"
          className={({ isActive }) => isActive ? "active" : ""}
        >
          Apartments
        </NavLink>

        <NavLink
          to="/food"
          className={({ isActive }) => isActive ? "active" : ""}
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
        <Link
          to="/food-cart"
          className="vibely-cart-link"
          aria-label={`Food cart with ${cartCount} items`}
          title="View food cart"
        >
          <i className="bi bi-bag"></i>

          {cartCount > 0 && (
            <span className="vibely-cart-count">
              {cartCount}
            </span>
          )}
        </Link>

        {accessToken ? (
          <AccountMenu />
        ) : (
          <>
            <Link to="/login" className="vibely-login-link">
              Login
            </Link>

            <Link to="/signup" className="vibely-signup-link">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;