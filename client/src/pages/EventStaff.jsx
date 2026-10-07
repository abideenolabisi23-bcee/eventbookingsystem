import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  UserPlus,
  Users,
  Trash2,
  Mail,
  ShieldCheck
} from "lucide-react";
import logo from "../assets/vibely-logo.png";
import "../styles/eventStaff.css";

const EventStaff = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const accessToken = localStorage.getItem("accessToken");

  const fetchEvent = async () => {
    try {
      const response = await axios.get(
        `http://192.168.0.3:5005/api/v1/events/${id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      setEvent(response.data.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        navigate("/organizer/login");
        return;
      }

      setMessage(
        error.response?.data?.message || "Cannot load event staff."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const addStaff = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setMessage("Enter the staff member's email address.");
      setMessageType("error");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const response = await axios.post(
        `http://192.168.0.3:5005/api/v1/organizer/events/${id}/staff`,
        {
          email: email.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      setEmail("");
      setMessage(
        response.data.message || "Staff member added successfully."
      );
      setMessageType("success");

      await fetchEvent();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Cannot add staff member at this time."
      );
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const removeStaff = async (staffId) => {
    const confirmed = window.confirm(
      "Remove this staff member from the event?"
    );

    if (!confirmed) return;

    try {
      const response = await axios.delete(
        `http://192.168.0.3:5005/api/v1/organizer/events/${id}/staff/${staffId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      setMessage(
        response.data.message || "Staff member removed successfully."
      );
      setMessageType("success");

      await fetchEvent();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Cannot remove staff member."
      );
      setMessageType("error");
    }
  };

  if (loading) {
    return (
      <div className="event-staff-loading">
        <div className="event-staff-spinner"></div>
        <p>Loading staff...</p>
      </div>
    );
  }

  return (
    <div className="event-staff-page">
      <header className="event-staff-topbar">
        <div
          className="event-staff-brand"
          onClick={() => navigate("/organizer/dashboard")}
        >
          <img src={logo} alt="Vibely" />
          <div>
            <h2>Vibely</h2>
            <span>Organizer</span>
          </div>
        </div>

        <button
          className="event-staff-back"
          onClick={() => navigate(`/organizer/events/${id}`)}
        >
          <ArrowLeft size={18} />
          Event Details
        </button>
      </header>

      <main className="event-staff-main">
        <section className="event-staff-heading">
          <span>EVENT OPERATIONS</span>
          <h1>Check-in Staff</h1>
          <p>
            Assign trusted staff members to verify tickets for{" "}
            <strong>{event?.title}</strong>.
          </p>
        </section>

        {message && (
          <div className={`event-staff-message ${messageType}`}>
            {message}
          </div>
        )}

        <div className="event-staff-grid">
          <section className="event-staff-add-card">
            <div className="event-staff-card-icon">
              <UserPlus size={25} />
            </div>

            <h2>Add Staff Member</h2>

            <p>
              Enter the email address of an existing Vibely user to give
              them ticket check-in access for this event.
            </p>

            <form onSubmit={addStaff}>
              <label>Email address</label>

              <div className="event-staff-email-input">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="staff@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button disabled={submitting}>
                <UserPlus size={18} />
                {submitting ? "Adding Staff..." : "Add Check-in Staff"}
              </button>
            </form>

            <div className="event-staff-permission">
              <ShieldCheck size={20} />

              <div>
                <strong>Limited access</strong>
                <span>
                  Assigned staff can verify tickets for this event without
                  receiving organizer dashboard access.
                </span>
              </div>
            </div>
          </section>

          <section className="event-staff-list-card">
            <div className="event-staff-list-heading">
              <div>
                <h2>Assigned Staff</h2>
                <p>People currently allowed to check in attendees.</p>
              </div>

              <span>
                <Users size={17} />
                {event?.checkInStaff?.length || 0}
              </span>
            </div>

            {!event?.checkInStaff?.length ? (
              <div className="event-staff-empty">
                <Users size={38} />
                <h3>No staff assigned yet</h3>
                <p>
                  Add a staff member using their Vibely account email.
                </p>
              </div>
            ) : (
              <div className="event-staff-list">
                {event.checkInStaff.map((staff) => (
                  <div
                    className="event-staff-person"
                    key={staff._id}
                  >
                    <div className="event-staff-avatar">
                      {staff.firstname?.charAt(0) || "S"}
                    </div>

                    <div className="event-staff-person-info">
                      <strong>
                        {staff.firstname} {staff.lastname}
                      </strong>
                      <span>{staff.email}</span>
                    </div>

                    <button
                      className="event-staff-remove"
                      onClick={() => removeStaff(staff._id)}
                      title="Remove staff"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="event-staff-actions">
          <button
            onClick={() =>
              navigate(`/organizer/events/${id}/check-in`)
            }
          >
            Open QR Check-in
          </button>

          <button
            className="event-staff-secondary"
            onClick={() =>
              navigate(`/organizer/events/${id}/bookings`)
            }
          >
            View Attendees
          </button>
        </section>
      </main>
    </div>
  );
};

export default EventStaff;