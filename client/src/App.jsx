
import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MyTickets from "./pages/MyTickets";
import Profile from "./pages/Profile";
import MyBookings from "./pages/MyBookings";
import MyFoodOrders from "./pages/MyFoodOrders";
import PaymentsRefunds from "./pages/PaymentsRefunds";
import ChangePassword from "./pages/ChangePassword";
import Apartments from "./pages/Apartments";
import ApartmentDetails from "./pages/ApartmentDetails";
import MyApartmentBookings from "./pages/MyApartmentBookings";
import ApartmentPaymentCallback from "./pages/ApartmentPaymentCallback";
import FoodOrderDetails from "./pages/FoodOrderDetails";
import ApartmentBookingDetails from "./pages/ApartmentBookingDetails";
import EventPaymentCallback from "./pages/EventPaymentCallback";

import OrganizerDashboard from "./pages/OrganizerDashboard";
import OrganizerPortal from "./pages/OrganizerPortal";
import OrganizerLogin from "./pages/OrganizerLogin";
import OrganizerRegister from "./pages/OrganizerRegister";
import OrganizerAccountStatus from "./pages/OrganizerAccountStatus";
import OrganizerProfile from "./pages/OrganizerProfile";
import OrganizerEvents from "./pages/OrganizerEvents";
import CreateEvent from "./pages/CreateEvent";
import OrganizerEventDetails from "./pages/OrganizerEventDetails";
import EditEvent from "./pages/EditEvent";
import EventBookings from "./pages/EventBookings";
import EventStaff from "./pages/EventStaff";
import QRCheckIn from "./pages/QRCheckIn";
import MyApartments from "./pages/MyApartments";
import AddApartment from "./pages/AddApartment";
import OrganizerApartmentDetails from "./pages/OrganizerApartmentDetails";
import EditApartment from "./pages/EditApartment";
import OrganizerApartmentBookings from "./pages/OrganizerApartmentBookings";
import OrganizerCheckIn from "./pages/OrganizerCheckIn";
import ApartmentQRCheckIn from "./pages/ApartmentQRCheckIn";

import UserProtectedRoute from "./component/UserProtectedRoute";
import OrganizerProtectedRoute from "./component/OrganizerProtectedRoute";

import Food from "./component/Food";
import FoodDetails from "./component/FoodDetails";
import FoodCheckout from "./component/FoodCheckout";
import FoodPaymentSuccess from "./component/FoodPaymentSuccess";

import AdminLogin from "./pages/AdminLogin";
import AdminForgotPassword from "./pages/AdminForgotPassword";
import AdminResetPassword from "./pages/AdminResetPassword";
import AdminProtectedRoute from "./component/AdminProtectedRoute";

import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminProviders from "./pages/AdminProviders";
import AdminEvents from "./pages/AdminEvents";
import AdminApartments from "./pages/AdminApartments";
import AdminFood from "./pages/AdminFood";
import AdminBookings from "./pages/AdminBookings";
import AdminPayments from "./pages/AdminPayments";
import AdminNotifications from "./pages/AdminNotifications";
import AdminSettings from "./pages/AdminSettings";

import MyRefunds from "./pages/MyRefunds";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/events"
          element={<Events />}
        />

        <Route
          path="/events/:id"
          element={<EventDetails />}
        />

        <Route
          path="/apartments"
          element={<Apartments />}
        />

        <Route
          path="/apartments/:id"
          element={<ApartmentDetails />}
        />

        <Route
          path="/food"
          element={<Food />}
        />

        <Route
          path="/food/:id"
          element={<FoodDetails />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route element={<UserProtectedRoute />}>
          <Route
            path="/profile"
            element={<Profile />}
          />

          <Route
            path="/my-tickets"
            element={<MyTickets />}
          />

          <Route
            path="/my-bookings"
            element={<MyBookings />}
          />

          <Route
            path="/my-refunds"
            element={<MyRefunds />}
          />

          <Route
            path="/my-apartment-bookings"
            element={<MyApartmentBookings />}
          />

          <Route
            path="/my-apartment-bookings/:id"
            element={<ApartmentBookingDetails />}
          />

          <Route
            path="/my-food-orders"
            element={<MyFoodOrders />}
          />

          <Route
            path="/my-food-orders/:id"
            element={<FoodOrderDetails />}
          />

          <Route
            path="/food-checkout/:orderId"
            element={<FoodCheckout />}
          />

          <Route
            path="/payments-refunds"
            element={<PaymentsRefunds />}
          />

          <Route
            path="/change-password"
            element={<ChangePassword />}
          />

          <Route
            path="/event-payment/callback"
            element={<EventPaymentCallback />}
          />

          <Route
            path="/apartment-payment/callback"
            element={<ApartmentPaymentCallback />}
          />

          <Route
            path="/food-payment/callback"
            element={<FoodPaymentSuccess />}
          />
        </Route>

        <Route
          path="/organizer"
          element={<OrganizerPortal />}
        />

        <Route
          path="/organizer/login"
          element={<OrganizerLogin />}
        />

        <Route
          path="/organizer/register"
          element={<OrganizerRegister />}
        />

        <Route
          path="/organizer/pending"
          element={<OrganizerAccountStatus />}
        />

        <Route
          path="/organizer/suspended"
          element={<OrganizerAccountStatus />}
        />

        <Route
  path="/organizer/rejected"
  element={<OrganizerAccountStatus />}
/>

        <Route element={<OrganizerProtectedRoute />}>
          <Route
            path="/organizer/dashboard"
            element={<OrganizerDashboard />}
          />

          <Route
            path="/organizer/profile"
            element={<OrganizerProfile />}
          />

          <Route
            path="/organizer/events"
            element={<OrganizerEvents />}
          />

          <Route
            path="/organizer/events/create"
            element={<CreateEvent />}
          />

          <Route
            path="/organizer/events/:id"
            element={<OrganizerEventDetails />}
          />

          <Route
            path="/organizer/events/:id/edit"
            element={<EditEvent />}
          />

          <Route
            path="/organizer/events/:id/bookings"
            element={<EventBookings />}
          />

          <Route
            path="/organizer/events/:id/staff"
            element={<EventStaff />}
          />

          <Route
            path="/organizer/events/:id/check-in"
            element={<QRCheckIn />}
          />

          <Route
            path="/organizer/apartments"
            element={<MyApartments />}
          />

          <Route
            path="/organizer/apartments/create"
            element={<AddApartment />}
          />

          <Route
            path="/organizer/apartments/:id"
            element={<OrganizerApartmentDetails />}
          />

          <Route
            path="/organizer/apartments/:id/edit"
            element={<EditApartment />}
          />

          <Route
            path="/organizer/apartments/:id/bookings"
            element={<OrganizerApartmentBookings />}
          />

          <Route
            path="/organizer/check-in"
            element={<OrganizerCheckIn />}
          />

          <Route
            path="/organizer/check-in/events"
            element={<QRCheckIn />}
          />

          <Route
            path="/organizer/check-in/apartments"
            element={<ApartmentQRCheckIn />}
          />
        </Route>

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin/forgot-password"
          element={<AdminForgotPassword />}
        />

        <Route
          path="/admin/reset-password/:token"
          element={<AdminResetPassword />}
        />

        <Route element={<AdminProtectedRoute />}>
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/users"
            element={<AdminUsers />}
          />

          <Route
            path="/admin/providers"
            element={<AdminProviders />}
          />

          <Route
            path="/admin/events"
            element={<AdminEvents />}
          />

          <Route
            path="/admin/apartments"
            element={<AdminApartments />}
          />

          <Route
            path="/admin/food"
            element={<AdminFood />}
          />

          <Route
            path="/admin/bookings"
            element={<AdminBookings />}
          />

          <Route
            path="/admin/payments"
            element={<AdminPayments />}
          />

          <Route
            path="/admin/notifications"
            element={<AdminNotifications />}
          />

          <Route
            path="/admin/settings"
            element={<AdminSettings />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
