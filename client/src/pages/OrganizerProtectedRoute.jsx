import { useEffect, useState } from "react";
import {
  Navigate,
  Outlet,
} from "react-router-dom";
import axios from "axios";

const OrganizerProtectedRoute = () => {
  const [status, setStatus] = useState("loading");

  const accessToken =
    localStorage.getItem("accessToken");

  useEffect(() => {
    const checkOrganizer = async () => {
      if (!accessToken) {
        setStatus("notLoggedIn");
        return;
      }

      try {
        const response = await axios.get(
          "http://https://eventbookingsystem-sooty.vercel.app/api/v1/profile",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const profileData = response.data.data;

        const user =
          profileData?.user || profileData;

        if (user.role !== "organizer") {
          setStatus("notOrganizer");
          return;
        }

        if (
          user.approvalStatus !== "approved"
        ) {
          setStatus("pending");
          return;
        }

        if (
          user.accountStatus !== "active"
        ) {
          setStatus("suspended");
          return;
        }

        setStatus("approved");
      } catch (error) {
        console.log(
          "ORGANIZER ROUTE ERROR:",
          error
        );

        if (error.response?.status === 401) {
          localStorage.removeItem(
            "accessToken"
          );

          localStorage.removeItem(
            "refreshToken"
          );

          localStorage.removeItem("role");

          setStatus("notLoggedIn");
          return;
        }

        setStatus("error");
      }
    };

    checkOrganizer();
  }, [accessToken]);

  if (status === "loading") {
    return (
      <div className="organizer-route-loading">
        <div className="organizer-route-spinner"></div>

        <h3>Vibely</h3>

        <p>
          Preparing your organizer workspace...
        </p>
      </div>
    );
  }

  if (status === "notLoggedIn") {
    return (
      <Navigate
        to="/organizer/login"
        replace
      />
    );
  }

  if (status === "notOrganizer") {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  if (status === "pending") {
    return (
      <Navigate
        to="/organizer/pending"
        replace
      />
    );
  }

  if (status === "suspended") {
    return (
      <Navigate
        to="/organizer/suspended"
        replace
      />
    );
  }

  if (status === "error") {
    return (
      <Navigate
        to="/organizer/login"
        replace
      />
    );
  }

  return <Outlet />;
};

export default OrganizerProtectedRoute;