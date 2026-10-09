
import { Navigate, Outlet, useLocation } from "react-router-dom";

const UserProtectedRoute = () => {
  const location = useLocation();

  const accessToken = localStorage.getItem("userAccessToken");
  const role = localStorage.getItem("userRole");

  if (!accessToken || role !== "user") {
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
