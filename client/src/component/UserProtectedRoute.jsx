
import { Navigate, Outlet, useLocation } from "react-router-dom";

const UserProtectedRoute = () => {
  const location = useLocation();
  const accessToken = localStorage.getItem("accessToken");
  const role = localStorage.getItem("role");

  if (!accessToken) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          returnTo: location.pathname + location.search
        }}
      />
    );
  }

  if (role !== "user" && role !== "organizer") {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          returnTo: location.pathname + location.search
        }}
      />
    );
  }

  return <Outlet />;
};

export default UserProtectedRoute;
