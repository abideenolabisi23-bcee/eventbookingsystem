import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  QrCode,
  Search,
  TicketCheck,
  History,
  CheckCircle2,
  XCircle,
  Clock3,
  User,
  MapPin,
  CalendarDays,
  CreditCard,
  Ticket,
  Hash,
  LoaderCircle,
  ShieldCheck,
  Camera,
  CameraOff
} from "lucide-react";
import logo from "../assets/vibely-logo.png";
import "../styles/qrCheckIn.css";

const QRCheckIn = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticketCode, setTicketCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);

  const scannerRef = useRef(null);
  const scannerRunningRef = useRef(false);

  const accessToken = localStorage.getItem("accessToken");

  const formatDateTime = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString("en-NG");
  };

  const handleUnauthorized = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    navigate("/organizer/login");
  };

  const fetchHistory = async () => {
    if (!accessToken) {
      handleUnauthorized();
      return;
    }

    try {
      const response = await axios.get(
        `http://192.168.0.3:5005/api/v1/organizer/events/${id}/check-ins`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      setHistory(response.data.data || []);
    } catch (error) {
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [id]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRunningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        console.log(error);
      }

      try {
        await scannerRef.current.clear();
      } catch (error) {
        console.log(error);
      }
    }

    scannerRunningRef.current = false;
    scannerRef.current = null;
    setScannerOpen(false);
    setScannerStarting(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRunningRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => { });
      }
    };
  }, []);

  const validateCode = async (code) => {
    const cleanCode = code.trim();

    if (!cleanCode) {
      setError("Enter a ticket code or scan a Vibely event QR code.");
      setValidationResult(null);
      setSuccessMessage("");
      return;
    }

    if (!accessToken) {
      handleUnauthorized();
      return;
    }

    try {
      setValidating(true);
      setError("");
      setSuccessMessage("");
      setValidationResult(null);

      const payload = cleanCode.startsWith("EVENT:")
        ? { qrData: cleanCode }
        : { ticketCode: cleanCode };

      const response = await axios.post(
        "http://192.168.0.3:5005/api/v1/tickets/validate",
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      setValidationResult(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      const responseData = error.response?.data;

      if (responseData?.data) {
        setValidationResult({
          ...responseData,
          valid: false
        });
      } else {
        setValidationResult(null);
      }

      setError(
        responseData?.message ||
        "Ticket validation failed. Please try again."
      );
    } finally {
      setValidating(false);
    }
  };

  const handleValidateTicket = async (e) => {
    e.preventDefault();
    await validateCode(ticketCode);
  };

  const startScanner = async () => {
    if (scannerRunningRef.current || scannerStarting) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setValidationResult(null);
    setScannerOpen(true);
    setScannerStarting(true);

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("vibely-event-qr-reader");

        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();

        if (!cameras || cameras.length === 0) {
          setError("No camera was found on this device.");
          setScannerOpen(false);
          setScannerStarting(false);
          return;
        }

        const backCamera =
          cameras.find((camera) =>
            camera.label.toLowerCase().includes("back")
          ) ||
          cameras.find((camera) =>
            camera.label.toLowerCase().includes("rear")
          ) ||
          cameras[cameras.length - 1];

        await scanner.start(
          backCamera.id,
          {
            fps: 10,
            qrbox: {
              width: 240,
              height: 240
            }
          },
          async (decodedText) => {
            if (!scannerRunningRef.current) {
              return;
            }

            const scannedCode = decodedText.trim();

            await stopScanner();

            setTicketCode(scannedCode);

            await validateCode(scannedCode);
          },
          () => { }
        );

        scannerRunningRef.current = true;
        setScannerStarting(false);
      } catch (error) {
        console.log("QR SCANNER ERROR:", error);

        scannerRunningRef.current = false;
        scannerRef.current = null;
        setScannerOpen(false);
        setScannerStarting(false);

        setError(
          "Camera could not be started. Allow camera permission or enter the ticket code manually."
        );
      }
    }, 100);
  };

  const handleCheckInGuest = async () => {
    const code = validationResult?.data?.ticketCode;

    if (!code) {
      setError("Ticket information is unavailable.");
      return;
    }

    try {
      setCheckingIn(true);
      setError("");
      setSuccessMessage("");

      const response = await axios.post(
        "http://192.168.0.3:5005/api/v1/tickets/check-in",
        {
          ticketCode: code
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      setSuccessMessage(
        response.data.message || "Guest checked in successfully."
      );

      setValidationResult((current) => ({
        ...current,
        valid: false,
        message: "This ticket has been checked in successfully.",
        data: {
          ...current.data,
          status: "used",
          checkedInAt: response.data.data?.checkedInAt,
          checkedInBy: response.data.data?.checkedInBy
        }
      }));

      setTicketCode("");

      await fetchHistory();
    } catch (error) {
      if (error.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(
        error.response?.data?.message ||
        "Cannot check in this guest at this time."
      );
    } finally {
      setCheckingIn(false);
    }
  };

  const handleNewValidation = async () => {
    await stopScanner();

    setTicketCode("");
    setValidationResult(null);
    setError("");
    setSuccessMessage("");
  };

  const ticketData = validationResult?.data;
  const ticketUser = ticketData?.user;
  const booking = ticketData?.booking;
  const event = ticketData?.event;

  return (
    <div className="qr-checkin-page">
      <header className="qr-checkin-topbar">
        <div
          className="qr-checkin-brand"
          onClick={() => navigate("/organizer/dashboard")}
        >
          <img src={logo} alt="Vibely" />

          <div>
            <h2>Vibely</h2>
            <span>Event Check-in</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/organizer/events/${id}`)}
          className="qr-checkin-back"
        >
          <ArrowLeft size={18} />
          Event Details
        </button>
      </header>

      <main className="qr-checkin-main">
        <section className="qr-checkin-heading">
          <span>EVENT OPERATIONS</span>

          <h1>Ticket Validation & Check-in</h1>

          <p>
            Scan an attendee's Vibely QR code or enter their ticket code
            manually. Validate the ticket before admitting the guest.
          </p>
        </section>

        <div className="qr-checkin-layout">
          <section className="qr-checkin-card">
            <div className="qr-checkin-icon">
              <QrCode size={31} />
            </div>

            <h2>Validate Ticket</h2>

            <p>
              Use the camera to scan the attendee's QR code or enter the
              ticket code manually. Validation does not check the guest in.
            </p>

            <div className="qr-scanner-actions">
              {!scannerOpen ? (
                <button
                  type="button"
                  className="qr-camera-button"
                  onClick={startScanner}
                  disabled={validating || scannerStarting}
                >
                  <Camera size={19} />
                  Scan QR Code
                </button>
              ) : (
                <button
                  type="button"
                  className="qr-camera-button qr-camera-stop"
                  onClick={stopScanner}
                >
                  <CameraOff size={19} />
                  Stop Camera
                </button>
              )}
            </div>

            {scannerOpen && (
              <div className="qr-camera-section">
                <div className="qr-camera-heading">
                  <div>
                    <span>LIVE CAMERA</span>
                    <h3>Scan Event Ticket</h3>
                  </div>

                  <div className="qr-camera-live">
                    <span></span>
                    Live
                  </div>
                </div>

                <div className="qr-reader-frame">
                  <div id="vibely-event-qr-reader"></div>

                  {scannerStarting && (
                    <div className="qr-camera-loading">
                      <LoaderCircle
                        size={30}
                        className="qr-spin"
                      />
                      <span>Starting camera...</span>
                    </div>
                  )}
                </div>

                <p className="qr-camera-help">
                  Place the customer's Vibely QR code inside the camera
                  frame. It will be detected automatically.
                </p>
              </div>
            )}

            <div className="qr-manual-divider">
              <span></span>
              <p>OR ENTER MANUALLY</p>
              <span></span>
            </div>

            <form onSubmit={handleValidateTicket}>
              <label>Ticket code / QR data</label>

              <div className="qr-checkin-input-wrapper">
                <QrCode size={19} />

                <input
                  type="text"
                  placeholder="TKT-... or EVENT:TKT-..."
                  value={ticketCode}
                  onChange={(e) => {
                    setTicketCode(e.target.value);
                    setError("");
                    setSuccessMessage("");
                  }}
                />
              </div>

              <button
                type="submit"
                className="qr-validate-button"
                disabled={validating}
              >
                {validating ? (
                  <LoaderCircle
                    size={19}
                    className="qr-spin"
                  />
                ) : (
                  <Search size={19} />
                )}

                {validating ? "Validating..." : "Validate Ticket"}
              </button>
            </form>

            {validationResult?.valid && ticketData && (
              <div className="qr-ticket-validation valid">
                <div className="qr-validation-heading">
                  <div className="qr-validation-status-icon">
                    <CheckCircle2 size={30} />
                  </div>

                  <div>
                    <span>VALID TICKET</span>
                    <h3>Entry can be approved</h3>

                    <p>
                      This ticket is valid. Review the attendee
                      information before checking them in.
                    </p>
                  </div>
                </div>

                <div className="qr-ticket-details">
                  <div className="qr-ticket-detail">
                    <div className="qr-ticket-detail-icon">
                      <User size={18} />
                    </div>

                    <div>
                      <span>Attendee</span>

                      <strong>
                        {ticketUser
                          ? `${ticketUser.firstname || ""} ${ticketUser.lastname || ""
                            }`.trim()
                          : "Not available"}
                      </strong>

                      {ticketUser?.email && (
                        <small>{ticketUser.email}</small>
                      )}
                    </div>
                  </div>

                  <div className="qr-ticket-detail">
                    <div className="qr-ticket-detail-icon">
                      <Hash size={18} />
                    </div>

                    <div>
                      <span>Ticket Code</span>
                      <strong>{ticketData.ticketCode}</strong>
                    </div>
                  </div>

                  <div className="qr-ticket-detail">
                    <div className="qr-ticket-detail-icon">
                      <Ticket size={18} />
                    </div>

                    <div>
                      <span>Ticket Type</span>

                      <strong>
                        {ticketData.ticketType || "Standard Ticket"}
                      </strong>

                      {ticketData.ticketPrice !== null &&
                        ticketData.ticketPrice !== undefined && (
                          <small>
                            ₦{formatPrice(ticketData.ticketPrice)}
                          </small>
                        )}
                    </div>
                  </div>

                  <div className="qr-ticket-detail">
                    <div className="qr-ticket-detail-icon">
                      <CreditCard size={18} />
                    </div>

                    <div>
                      <span>Payment</span>

                      <strong className="qr-capitalize">
                        {booking?.paymentStatus || "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="qr-ticket-detail">
                    <div className="qr-ticket-detail-icon">
                      <TicketCheck size={18} />
                    </div>

                    <div>
                      <span>Booking Reference</span>

                      <strong>
                        {booking?.bookingReference || "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="qr-ticket-detail">
                    <div className="qr-ticket-detail-icon">
                      <ShieldCheck size={18} />
                    </div>

                    <div>
                      <span>Ticket Status</span>

                      <strong className="qr-capitalize">
                        {ticketData.status}
                      </strong>
                    </div>
                  </div>
                </div>

                {event && (
                  <div className="qr-event-information">
                    <span className="qr-event-information-label">
                      EVENT
                    </span>

                    <h3>{event.title}</h3>

                    <div className="qr-event-information-row">
                      <span>
                        <CalendarDays size={16} />
                        {formatDateTime(event.date)}
                      </span>

                      <span>
                        <MapPin size={16} />
                        {event.location}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="qr-confirm-checkin-button"
                  onClick={handleCheckInGuest}
                  disabled={checkingIn}
                >
                  {checkingIn ? (
                    <LoaderCircle
                      size={19}
                      className="qr-spin"
                    />
                  ) : (
                    <TicketCheck size={19} />
                  )}

                  {checkingIn
                    ? "Checking In..."
                    : "Check In Guest"}
                </button>
              </div>
            )}

            {validationResult &&
              !validationResult.valid &&
              ticketData && (
                <div className="qr-ticket-validation invalid">
                  <div className="qr-validation-heading">
                    <div className="qr-validation-status-icon">
                      {ticketData.status === "used" ? (
                        <Clock3 size={30} />
                      ) : (
                        <XCircle size={30} />
                      )}
                    </div>

                    <div>
                      <span>
                        {ticketData.status === "used"
                          ? "ALREADY USED"
                          : "TICKET NOT VALID"}
                      </span>

                      <h3>
                        {validationResult.message ||
                          "Entry is not allowed"}
                      </h3>
                    </div>
                  </div>

                  <div className="qr-ticket-details">
                    <div className="qr-ticket-detail">
                      <div className="qr-ticket-detail-icon">
                        <Hash size={18} />
                      </div>

                      <div>
                        <span>Ticket Code</span>

                        <strong>
                          {ticketData.ticketCode ||
                            "Not available"}
                        </strong>
                      </div>
                    </div>

                    <div className="qr-ticket-detail">
                      <div className="qr-ticket-detail-icon">
                        <ShieldCheck size={18} />
                      </div>

                      <div>
                        <span>Status</span>

                        <strong className="qr-capitalize">
                          {ticketData.status ||
                            "Not available"}
                        </strong>
                      </div>
                    </div>

                    {ticketData.checkedInAt && (
                      <div className="qr-ticket-detail">
                        <div className="qr-ticket-detail-icon">
                          <Clock3 size={18} />
                        </div>

                        <div>
                          <span>Checked In</span>

                          <strong>
                            {formatDateTime(
                              ticketData.checkedInAt
                            )}
                          </strong>
                        </div>
                      </div>
                    )}

                    {ticketUser && (
                      <div className="qr-ticket-detail">
                        <div className="qr-ticket-detail-icon">
                          <User size={18} />
                        </div>

                        <div>
                          <span>Attendee</span>

                          <strong>
                            {`${ticketUser.firstname || ""} ${ticketUser.lastname || ""
                              }`.trim()}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {event && (
                    <div className="qr-event-information">
                      <span className="qr-event-information-label">
                        EVENT
                      </span>

                      <h3>{event.title}</h3>
                    </div>
                  )}
                </div>
              )}

            {successMessage && (
              <div className="qr-checkin-result success">
                <CheckCircle2 size={30} />

                <div>
                  <h3>Guest Checked In</h3>
                  <p>{successMessage}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="qr-checkin-result error">
                <XCircle size={30} />

                <div>
                  <h3>Entry Not Allowed</h3>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {(validationResult ||
              error ||
              successMessage) && (
                <button
                  type="button"
                  className="qr-new-validation-button"
                  onClick={handleNewValidation}
                >
                  <QrCode size={18} />
                  Validate Another Ticket
                </button>
              )}
          </section>

          <section className="qr-checkin-history">
            <div className="qr-checkin-history-title">
              <div>
                <h2>
                  <History size={21} />
                  Check-in History
                </h2>

                <p>Recently admitted attendees.</p>
              </div>

              <span>{history.length}</span>
            </div>

            {loadingHistory ? (
              <div className="qr-checkin-history-empty">
                <LoaderCircle
                  size={30}
                  className="qr-spin"
                />
                <p>Loading check-ins...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="qr-checkin-history-empty">
                <Clock3 size={38} />

                <h3>No check-ins yet</h3>

                <p>
                  Successfully checked-in attendees will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="qr-checkin-history-list">
                {history.map((ticket) => (
                  <div
                    className="qr-checkin-history-item"
                    key={ticket._id}
                  >
                    <div className="qr-checkin-history-avatar">
                      {ticket.user?.firstname
                        ?.charAt(0)
                        ?.toUpperCase() || "A"}
                    </div>

                    <div className="qr-checkin-history-info">
                      <strong>
                        {ticket.user?.firstname}{" "}
                        {ticket.user?.lastname}
                      </strong>

                      <span>{ticket.ticketCode}</span>

                      <small>
                        {formatDateTime(ticket.checkedInAt)}
                      </small>
                    </div>

                    <div className="qr-checkin-valid">
                      <CheckCircle2 size={17} />
                      Checked in
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default QRCheckIn;