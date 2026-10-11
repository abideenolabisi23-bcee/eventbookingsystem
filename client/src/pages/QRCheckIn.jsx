
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  CircleAlert,
  Keyboard,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Ticket,
  UserRound,
  CalendarDays,
  MapPin,
  CreditCard,
  Clock,
  ChevronRight,
  Sparkles
} from "lucide-react";
import "../styles/qrCheckIn.css";
import vibelyLogo from "../assets/vibely-logo.png";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const READER_ID = "event-organizer-qr-reader";

const getGuestName = (data) => {
  const user =
    data?.user ||
    data?.guest ||
    data?.booking?.user;

  if (!user) return "Guest";

  const name = [user.firstname, user.lastname]
    .filter(Boolean)
    .join(" ");

  return name || user.email || "Guest";
};

const getEvent = (data) =>
  data?.event || data?.booking?.event || {};

const getEventTitle = (data) =>
  getEvent(data)?.title || "Event";

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const formatMoney = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not available";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(amount);
};

const getTicketPayload = (value) => {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return null;

  if (/^EVENT:/i.test(cleanValue)) {
    return { qrData: cleanValue };
  }

  return { ticketCode: cleanValue };
};

const QRCheckIn = () => {
  const navigate = useNavigate();

  const scannerRef = useRef(null);
  const scannerQueueRef = useRef(Promise.resolve());
  const processingRef = useRef(false);
  const requestRef = useRef(false);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);

  const [ticketCode, setTicketCode] = useState("");
  const [validatedData, setValidatedData] = useState(null);
  const [ticketValid, setTicketValid] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [validating, setValidating] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);

  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");

  const [scanHistory, setScanHistory] = useState([]);

  const firstname =
    localStorage.getItem("firstname") || "Organizer";

  const queueScannerOperation = (operation) => {
    const next = scannerQueueRef.current
      .catch(() => {})
      .then(operation);

    scannerQueueRef.current = next.catch(() => {});

    return next;
  };

  const releaseScanner = async () => {
    const scanner = scannerRef.current;

    if (!scanner) return;

    scannerRef.current = null;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (error) {
      console.error("Camera stop error:", error);
    }

    try {
      await scanner.clear();
    } catch (error) {
      console.error("Camera cleanup error:", error);
    }
  };

  const stopScanner = async () => {
    startingRef.current = false;

    if (mountedRef.current) {
      setCameraStarted(false);
      setStartingCamera(false);
    }

    await queueScannerOperation(releaseScanner);
  };

  useEffect(() => {
    mountedRef.current = true;

    const loadCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();

        if (!mountedRef.current) return;

        setCameras(devices || []);

        if (devices?.length) {
          const preferred =
            devices.find((camera) =>
              /back|rear|environment/i.test(
                camera.label
              )
            ) || devices[0];

          setSelectedCamera(preferred.id);
        }
      } catch (error) {
        console.error(
          "Camera discovery error:",
          error
        );
      }
    };

    loadCameras();

    return () => {
      mountedRef.current = false;
      startingRef.current = false;

      queueScannerOperation(releaseScanner);
    };
  }, []);

  const resetResult = () => {
    setValidatedData(null);
    setTicketValid(false);
    setMessage("");
    setMessageType("");
  };

  const validateTicket = async (value) => {
    const payload = getTicketPayload(value);

    if (!payload) {
      resetResult();
      setMessage("Enter a ticket code first.");
      setMessageType("error");
      processingRef.current = false;
      return;
    }

    if (requestRef.current) return;

    const accessToken =
      localStorage.getItem("organizerAccessToken");

    if (!accessToken) {
      resetResult();

      setMessage(
        "Your session has expired. Please log in again."
      );

      setMessageType("error");
      processingRef.current = false;
      return;
    }

    requestRef.current = true;

    try {
      setValidating(true);
      resetResult();

      const response = await axios.post(
        `${API_URL}/tickets/validate`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (!mountedRef.current) return;

      const result = response.data;
      const data = result?.data || null;

      const isValid =
        result?.valid === true &&
        data?.status === "valid";

      setValidatedData(data);
      setTicketValid(isValid);

      setMessage(
        result?.message ||
          (isValid
            ? "Ticket validated successfully."
            : "This ticket cannot be used.")
      );

      setMessageType(
        isValid ? "success" : "warning"
      );

      if (data?.ticketCode) {
        setTicketCode(data.ticketCode);
      }
    } catch (error) {
      if (!mountedRef.current) return;

      const result = error.response?.data;

      setValidatedData(result?.data || null);
      setTicketValid(false);

      setMessage(
        result?.message ||
          "Unable to validate this ticket."
      );

      setMessageType("error");
    } finally {
      requestRef.current = false;
      processingRef.current = false;

      if (mountedRef.current) {
        setValidating(false);
      }
    }
  };

  const startScanner = async () => {
    if (
      cameraStarted ||
      startingRef.current ||
      scannerRef.current ||
      validating ||
      checkingIn
    ) {
      return;
    }

    resetResult();

    startingRef.current = true;
    setStartingCamera(true);

    try {
      await queueScannerOperation(async () => {
        if (
          !mountedRef.current ||
          !startingRef.current
        ) {
          return;
        }

        const devices =
          await Html5Qrcode.getCameras();

        if (!devices?.length) {
          throw new Error(
            "No camera was found on this device."
          );
        }

        if (
          !mountedRef.current ||
          !startingRef.current
        ) {
          return;
        }

        setCameras(devices);

        const preferred =
          devices.find(
            (camera) =>
              camera.id === selectedCamera
          ) ||
          devices.find((camera) =>
            /back|rear|environment/i.test(
              camera.label
            )
          ) ||
          devices[0];

        const cameraId = preferred.id;

        setSelectedCamera(cameraId);

        const scanner = new Html5Qrcode(
          READER_ID,
          { verbose: false }
        );

        scannerRef.current = scanner;

        try {
          await scanner.start(
            cameraId,
            {
              fps: 10,
              qrbox: (width, height) => {
                const shortestSide = Math.min(
                  width,
                  height
                );

                const size = Math.max(
                  50,
                  Math.min(
                    250,
                    Math.floor(
                      shortestSide * 0.7
                    )
                  )
                );

                return {
                  width: Math.min(
                    size,
                    shortestSide
                  ),
                  height: Math.min(
                    size,
                    shortestSide
                  )
                };
              },
              disableFlip: false
            },
            (decodedText) => {
              if (
                processingRef.current ||
                requestRef.current
              ) {
                return;
              }

              const scannedValue = String(
                decodedText || ""
              ).trim();

              if (!scannedValue) return;

              processingRef.current = true;

              stopScanner()
                .then(() =>
                  validateTicket(scannedValue)
                )
                .catch((error) => {
                  console.error(
                    "Scan processing error:",
                    error
                  );

                  processingRef.current = false;

                  if (mountedRef.current) {
                    setMessage(
                      "The QR code was detected, but verification could not be completed."
                    );

                    setMessageType("error");
                  }
                });
            },
            () => {}
          );

          if (
            !mountedRef.current ||
            !startingRef.current
          ) {
            await releaseScanner();
            return;
          }

          setCameraStarted(true);
        } catch (error) {
          await releaseScanner();
          throw error;
        }
      });
    } catch (error) {
      if (mountedRef.current) {
        setMessage(
          error.message ||
            "Unable to start the camera."
        );

        setMessageType("error");
        setCameraStarted(false);
      }
    } finally {
      startingRef.current = false;

      if (mountedRef.current) {
        setStartingCamera(false);
      }
    }
  };

  const handleCameraChange = async (event) => {
    const cameraId = event.target.value;

    await stopScanner();

    setSelectedCamera(cameraId);
  };

  const handleManualValidation = async (event) => {
    event.preventDefault();

    if (
      validating ||
      requestRef.current ||
      checkingIn
    ) {
      return;
    }

    await stopScanner();
    await validateTicket(ticketCode);
  };

  const handleCheckIn = async () => {
    if (
      !ticketValid ||
      validatedData?.status !== "valid" ||
      !validatedData?.ticketCode ||
      checkingIn
    ) {
      return;
    }

    const accessToken =
      localStorage.getItem("organizerAccessToken");

    if (!accessToken) {
      setMessage(
        "Your session has expired. Please log in again."
      );

      setMessageType("error");
      return;
    }

    const currentTicket = validatedData;

    try {
      setCheckingIn(true);

      const response = await axios.post(
        `${API_URL}/tickets/check-in`,
        {
          ticketCode: currentTicket.ticketCode
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (!mountedRef.current) return;

      const result = response.data;

      const checkedInAt =
        result.data?.checkedInAt ||
        new Date().toISOString();

      setTicketValid(false);

      setValidatedData((previous) => ({
        ...previous,
        status: "used",
        checkedInAt,
        checkedInBy:
          result.data?.checkedInBy
      }));

      setMessage(
        result.message ||
          "Guest checked in successfully."
      );

      setMessageType("success");

      setScanHistory((previous) => [
        {
          ticketCode:
            currentTicket.ticketCode,
          guest:
            getGuestName(currentTicket),
          event:
            getEventTitle(currentTicket),
          checkedInAt
        },
        ...previous.filter(
          (item) =>
            item.ticketCode !==
            currentTicket.ticketCode
        )
      ]);
    } catch (error) {
      if (!mountedRef.current) return;

      setTicketValid(false);

      setMessage(
        error.response?.data?.message ||
          "Unable to check in this guest. Validate the ticket again before retrying."
      );

      setMessageType("error");
    } finally {
      if (mountedRef.current) {
        setCheckingIn(false);
      }
    }
  };

  const handleScanAnother = async () => {
    await stopScanner();

    processingRef.current = false;
    setTicketCode("");
    resetResult();
  };

  const event = getEvent(validatedData);

  const ticketStatus =
    validatedData?.status ||
    validatedData?.ticketStatus ||
    "";

  const alreadyUsed =
    ticketStatus === "used" ||
    Boolean(validatedData?.checkedInAt);

  const canCheckIn =
    ticketValid &&
    ticketStatus === "valid" &&
    !checkingIn &&
    !validating;

  const getStatusLabel = () => {
    if (alreadyUsed) {
      return "Ticket already used";
    }

    if (ticketStatus === "cancelled") {
      return "Ticket cancelled";
    }

    if (ticketStatus === "refund_pending") {
      return "Refund pending";
    }

    if (canCheckIn) {
      return "Valid event ticket";
    }

    return "Ticket not cleared for entry";
  };

  return (
    <div className="qr-checkin-page">
      <header className="qr-checkin-header">
        <button
          className="qr-checkin-brand"
          onClick={() =>
            navigate("/organizer/dashboard")
          }
          type="button"
        >
          <img
            src={vibelyLogo}
            alt="Vibely"
          />
        </button>

        <div className="qr-header-center">
          <ShieldCheck size={16} />
          <span>
            Organizer Check-In Portal
          </span>
        </div>

        <button
          className="qr-checkin-back-button"
          onClick={() =>
            navigate("/organizer/check-in")
          }
          type="button"
        >
          <ArrowLeft size={17} />
          <span>Check-In Center</span>
        </button>
      </header>

      <main className="qr-checkin-main">
        <section className="qr-hero">
          <div className="qr-hero-content">
            <div className="qr-hero-badge">
              <Sparkles size={14} />
              EVENT OPERATIONS
            </div>

            <h1>
              Fast, secure event
              <span> check-in.</span>
            </h1>

            <p>
              Welcome back, {firstname}.
              Scan any Vibely event ticket
              belonging to your organizer
              account and verify your
              guest in seconds.
            </p>

            <div className="qr-hero-features">
              <div>
                <CheckCircle2 size={16} />
                <span>
                  Instant verification
                </span>
              </div>

              <div>
                <ShieldCheck size={16} />
                <span>
                  Organizer protected
                </span>
              </div>

              <div>
                <Ticket size={16} />
                <span>
                  All your events
                </span>
              </div>
            </div>
          </div>

          <div className="qr-hero-art">
            <div className="qr-hero-art-glow"></div>

            <div className="qr-floating-ticket">
              <div className="qr-floating-ticket-top">
                <div className="qr-floating-icon">
                  <QrCode size={29} />
                </div>

                <div>
                  <span>
                    VIBELY ACCESS
                  </span>

                  <strong>
                    Event Check-In
                  </strong>
                </div>
              </div>

              <div className="qr-ticket-dashes"></div>

              <div className="qr-floating-ticket-bottom">
                <span>
                  SCAN • VERIFY • WELCOME
                </span>

                <ShieldCheck size={20} />
              </div>
            </div>
          </div>
        </section>

        <section className="qr-security-strip">
          <div className="qr-security-strip-icon">
            <ShieldCheck size={20} />
          </div>

          <div>
            <strong>
              One scanner. Every event you own.
            </strong>

            <p>
              Vibely identifies the event
              directly from the ticket.
              Tickets belonging to another
              organizer are automatically
              rejected.
            </p>
          </div>
        </section>

        <div className="qr-workspace">
          <section className="qr-scanner-panel">
            <div className="qr-panel-heading">
              <div>
                <span className="qr-section-label">
                  CAMERA SCANNER
                </span>

                <h2>
                  Scan Event Ticket
                </h2>

                <p>
                  Position the QR code
                  inside the frame for
                  automatic validation.
                </p>
              </div>

              <div className="qr-panel-heading-icon">
                <ScanLine size={24} />
              </div>
            </div>

            {cameras.length > 0 && (
              <div className="qr-camera-field">
                <label htmlFor="event-camera-select">
                  Camera source
                </label>

                <div className="qr-select-wrap">
                  <Camera size={17} />

                  <select
                    id="event-camera-select"
                    value={selectedCamera}
                    onChange={handleCameraChange}
                    disabled={
                      startingCamera ||
                      validating
                    }
                  >
                    {cameras.map(
                      (camera, index) => (
                        <option
                          key={camera.id}
                          value={camera.id}
                        >
                          {camera.label ||
                            `Camera ${index + 1}`}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            )}

            <div
              className={`qr-camera-area ${
                cameraStarted ? "active" : ""
              }`}
            >
              <div className="event-camera-preview">
                <div
                  id={READER_ID}
                  className="qr-reader"
                ></div>

                {cameraStarted && (
                  <div className="event-qr-scan-overlay">
                    <div className="event-qr-scan-box">
                      <span className="event-qr-corner event-top-left"></span>
                      <span className="event-qr-corner event-top-right"></span>
                      <span className="event-qr-corner event-bottom-left"></span>
                      <span className="event-qr-corner event-bottom-right"></span>

                      <div className="event-qr-scan-line"></div>
                    </div>

                    <p>
                      Align QR code within the frame
                    </p>
                  </div>
                )}
              </div>

              {!cameraStarted && (
                <div className="qr-camera-placeholder">
                  <div className="qr-scan-frame">
                    <span className="corner top-left"></span>
                    <span className="corner top-right"></span>
                    <span className="corner bottom-left"></span>
                    <span className="corner bottom-right"></span>

                    <div className="qr-camera-icon">
                      <QrCode size={48} />
                    </div>
                  </div>

                  <h3>
                    {startingCamera
                      ? "Starting camera..."
                      : "Ready to scan"}
                  </h3>

                  <p>
                    Start your camera, then
                    hold the guest's QR code
                    inside the frame.
                  </p>
                </div>
              )}
            </div>

            {!cameraStarted ? (
              <button
                className="qr-primary-button"
                onClick={startScanner}
                disabled={
                  startingCamera ||
                  validating ||
                  checkingIn
                }
                type="button"
              >
                <Camera size={18} />

                {startingCamera
                  ? "Starting Camera..."
                  : "Start Camera"}

                {!startingCamera && (
                  <ChevronRight size={18} />
                )}
              </button>
            ) : (
              <button
                className="qr-stop-button"
                onClick={stopScanner}
                type="button"
              >
                <Camera size={18} />
                Stop Camera
              </button>
            )}

            <div className="qr-divider">
              <span>
                OR ENTER MANUALLY
              </span>
            </div>

            <form
              className="qr-manual-form"
              onSubmit={
                handleManualValidation
              }
            >
              <label htmlFor="event-ticket-code">
                Ticket code
              </label>

              <div className="qr-manual-input-wrap">
                <Keyboard size={18} />

                <input
                  id="event-ticket-code"
                  type="text"
                  value={ticketCode}
                  onChange={(event) => {
                    setTicketCode(
                      event.target.value
                    );

                    resetResult();
                  }}
                  placeholder="TKT-..."
                />
              </div>

              <button
                type="submit"
                className="qr-validate-button"
                disabled={
                  validating ||
                  checkingIn ||
                  !ticketCode.trim()
                }
              >
                <QrCode size={18} />

                {validating
                  ? "Validating Ticket..."
                  : "Validate Ticket"}
              </button>
            </form>
          </section>

          <section className="qr-result-panel">
            <div className="qr-panel-heading">
              <div>
                <span className="qr-section-label">
                  GUEST VERIFICATION
                </span>

                <h2>
                  Ticket Details
                </h2>

                <p>
                  Guest and event information
                  appears here after validation.
                </p>
              </div>

              <div className="qr-panel-heading-icon">
                <ShieldCheck size={24} />
              </div>
            </div>

            {!validatedData && !message && (
              <div className="qr-empty-result">
                <div className="qr-empty-visual">
                  <div className="qr-empty-circle">
                    <Ticket size={38} />
                  </div>

                  <span className="qr-empty-dot dot-one"></span>
                  <span className="qr-empty-dot dot-two"></span>
                  <span className="qr-empty-dot dot-three"></span>
                </div>

                <h3>
                  No ticket scanned yet
                </h3>

                <p>
                  Scan a guest's QR code or
                  enter their ticket code.
                  Their ticket, event and
                  check-in information will
                  appear here.
                </p>

                <div className="qr-empty-secure">
                  <ShieldCheck size={15} />
                  Secure organizer verification
                </div>
              </div>
            )}

            {message && (
              <div
                className={`qr-message ${messageType}`}
                role="status"
              >
                <div className="qr-message-icon">
                  {messageType ===
                  "success" ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <CircleAlert size={20} />
                  )}
                </div>

                <span>{message}</span>
              </div>
            )}

            {validatedData && (
              <div className="qr-ticket-result">
                <div
                  className={`qr-validation-banner ${
                    canCheckIn
                      ? "valid"
                      : "used"
                  }`}
                >
                  <div className="qr-validation-icon">
                    {canCheckIn ? (
                      <CheckCircle2 size={25} />
                    ) : (
                      <CircleAlert size={25} />
                    )}
                  </div>

                  <div>
                    <span>
                      {canCheckIn
                        ? "VERIFICATION SUCCESSFUL"
                        : "CHECK-IN STATUS"}
                    </span>

                    <strong>
                      {getStatusLabel()}
                    </strong>
                  </div>
                </div>

                <div className="qr-guest-card">
                  <div className="qr-guest-avatar">
                    <UserRound size={25} />
                  </div>

                  <div className="qr-guest-info">
                    <span>
                      ATTENDEE
                    </span>

                    <h3>
                      {getGuestName(
                        validatedData
                      )}
                    </h3>

                    <p>
                      {validatedData?.user
                        ?.email ||
                        validatedData?.guest
                          ?.email ||
                        validatedData
                          ?.booking?.user
                          ?.email ||
                        "Vibely guest"}
                    </p>
                  </div>

                  <div
                    className={`qr-status-pill ${
                      canCheckIn
                        ? "valid"
                        : "used"
                    }`}
                  >
                    {ticketStatus ===
                    "refund_pending"
                      ? "Refund Pending"
                      : ticketStatus ===
                        "cancelled"
                      ? "Cancelled"
                      : alreadyUsed
                      ? "Used"
                      : canCheckIn
                      ? "Valid"
                      : "Not Valid"}
                  </div>
                </div>

                <div className="qr-event-highlight">
                  <div className="qr-event-highlight-icon">
                    <CalendarDays size={21} />
                  </div>

                  <div>
                    <span>EVENT</span>

                    <strong>
                      {getEventTitle(
                        validatedData
                      )}
                    </strong>
                  </div>
                </div>

                <div className="qr-detail-list">
                  <div className="qr-detail-item">
                    <MapPin size={18} />

                    <div>
                      <span>
                        Location
                      </span>

                      <strong>
                        {event.location ||
                          "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="qr-detail-item">
                    <Clock size={18} />

                    <div>
                      <span>
                        Event Date
                      </span>

                      <strong>
                        {formatDate(
                          event.date
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="qr-detail-item">
                    <Ticket size={18} />

                    <div>
                      <span>
                        Ticket Code
                      </span>

                      <strong>
                        {validatedData
                          .ticketCode ||
                          "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="qr-detail-item">
                    <UserRound size={18} />

                    <div>
                      <span>
                        Ticket Type
                      </span>

                      <strong>
                        {validatedData
                          .ticketType ||
                          "Standard"}
                      </strong>
                    </div>
                  </div>

                  <div className="qr-detail-item">
                    <CreditCard size={18} />

                    <div>
                      <span>
                        Ticket Price
                      </span>

                      <strong>
                        {formatMoney(
                          validatedData
                            .ticketPrice
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="qr-detail-item">
                    <ShieldCheck size={18} />

                    <div>
                      <span>
                        Status
                      </span>

                      <strong>
                        {alreadyUsed
                          ? "Checked In"
                          : canCheckIn
                          ? "Ready for Check-In"
                          : getStatusLabel()}
                      </strong>
                    </div>
                  </div>
                </div>

                {canCheckIn && (
                  <button
                    className="qr-checkin-button"
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    type="button"
                  >
                    <CheckCircle2 size={19} />

                    {checkingIn
                      ? "Checking In Guest..."
                      : "Check In Guest"}

                    {!checkingIn && (
                      <ChevronRight size={18} />
                    )}
                  </button>
                )}

                {alreadyUsed &&
                  validatedData
                    .checkedInAt && (
                    <div className="qr-checked-time">
                      <CheckCircle2 size={18} />

                      <div>
                        <span>
                          Checked in
                        </span>

                        <strong>
                          {formatDate(
                            validatedData
                              .checkedInAt
                          )}
                        </strong>
                      </div>
                    </div>
                  )}

                <button
                  className="qr-scan-another-button"
                  onClick={
                    handleScanAnother
                  }
                  type="button"
                >
                  <RotateCcw size={17} />
                  Scan Another Ticket
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="qr-help-strip">
          <div>
            <div className="qr-help-icon">
              <QrCode size={20} />
            </div>

            <div>
              <strong>
                Can't scan the QR code?
              </strong>

              <p>
                Use the ticket code printed
                on the customer's Vibely
                ticket.
              </p>
            </div>
          </div>

          <span>
            Manual verification is
            protected by the same
            organizer ownership checks.
          </span>
        </section>

        {scanHistory.length > 0 && (
          <section className="qr-history">
            <div className="qr-history-heading">
              <div>
                <span className="qr-section-label">
                  THIS SESSION
                </span>

                <h2>
                  Recent Event Check-Ins
                </h2>

                <p>
                  Guests successfully admitted
                  during your current session.
                </p>
              </div>

              <div className="qr-history-count">
                {scanHistory.length}
              </div>
            </div>

            <div className="qr-history-list">
              {scanHistory.map(
                (item) => (
                  <div
                    className="qr-history-item"
                    key={
                      item.ticketCode
                    }
                  >
                    <div className="qr-history-success">
                      <CheckCircle2 size={19} />
                    </div>

                    <div className="qr-history-person">
                      <strong>
                        {item.guest}
                      </strong>

                      <span>
                        {item.event}
                      </span>
                    </div>

                    <div className="qr-history-code">
                      <strong>
                        {item.ticketCode}
                      </strong>

                      <span>
                        {formatDate(
                          item.checkedInAt
                        )}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default QRCheckIn;
