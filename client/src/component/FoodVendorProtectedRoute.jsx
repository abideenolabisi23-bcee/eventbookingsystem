
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "axios";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1"
).replace(/\/+$/, "");

const FoodVendorProtectedRoute = () => {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const controller = new AbortController();

    const verifyVendor = async () => {
      const token = localStorage.getItem("foodVendorAccessToken");

      if (!token) {
        setStatus("unauthorized");
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal
        });

        const profileData = response.data?.data;
        const vendor = profileData?.user || profileData;

        if (
          vendor?.role === "food_vendor" &&
          vendor?.approvalStatus === "approved" &&
          vendor?.accountStatus !== "suspended"
        ) {
          setStatus("authorized");
        } else {
          setStatus("unauthorized");
        }
      } catch (error) {
        if (error.code !== "ERR_CANCELED") {
          setStatus("unauthorized");
        }
      }
    };

    verifyVendor();

    return () => controller.abort();
  }, []);

  if (status === "checking") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "15px",
          background: "#faf7f8",
          color: "#68001c"
        }}
      >
        <div
          className="spinner-border"
          role="status"
          aria-label="Loading"
        />

        <p>Verifying your food vendor account...</p>
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <Navigate
        to="/food-vendor/login"
        replace
        state={{
          notification: {
            type: "error",
            title: "Access restricted",
            message:
              "Please sign in with an approved food vendor account to continue."
          }
        }}
      />
    );
  }

  return <Outlet />;
};

export default FoodVendorProtectedRoute;
