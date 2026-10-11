
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleAlert,
  Clock,
  CreditCard,
  Home,
  Keyboard,
  MapPin,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import "../styles/apartmentQRCheckIn.css";
import vibelyLogo from "../assets/vibely-logo.png";

const API_URL =
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const READER_ID = "apartment-organizer-qr-reader";

const formatCategory = (value) => {
  if (!value) return "Not available";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatStayType = (value) => {
  if (value === "day_use") return "Day Use";
  if (value === "overnight") return "Overnight";
  return formatCategory(value);
};

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const formatDateTime = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const formatMoney = (value) => {
  const amount = Number(value);

  if (value == null || !Number.isFinite(amount)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(amount);
};

const getGuestName = (data) => {
  const guest = data?.guest;

  if (!guest) return "Guest";

  return (
    [guest.firstname, guest.lastname]
      .filter(Boolean)
      .join(" ") ||
    guest.email ||
    "Guest"
  );
};

const getGuestEmail = (data) => {
  return data?.guest?.email || "Guest information verified";
};

const ApartmentQRCheckIn = () => {
  const navigate = useNavigate();

  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const scannerQueueRef = useRef(Promise.resolve());
  const validationIdRef = useRef(0);

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

  const getAccessToken = () => {
    return localStorage.getItem("organizerAccessToken");
  };

  const showMessage = (text, type = "error") => {
    if (!mountedRef.current) return;

    setMessage(text);
    setMessageType(type);
  };

  const resetResult = () => {
    validationIdRef.current += 1;
    setValidatedData(null);
    setTicketValid(false);
    setMessage("");
    setMessageType("");
    setValidating(false);
  };

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
            devices.find((device) =>
              /back|rear|environment/i.test(device.label)
            ) || devices[0];

          setSelectedCamera(preferred.id);
        }
      } catch (error) {
        console.error("Camera discovery error:", error);
      }
    };

    loadCameras();

    return () => {
      mountedRef.current = false;
      startingRef.current = false;
      validationIdRef.current += 1;

      queueScannerOperation(releaseScanner);
    };
  }, []);

  const validateTicket = async (value, scanned = false) => {
    if (processingRef.current && !scanned) {
      return;
    }

    const cleanValue = String(value || "").trim();

    if (!cleanValue) {
      showMessage("Enter an apartment ticket code first.");
      processingRef.current = false;
      return;
    }

    const accessToken = getAccessToken();

    if (!accessToken) {
      showMessage(
        "Your session has expired. Please log in again."
      );
      processingRef.current = false;
      return;
    }

    const requestId = ++validationIdRef.current;

    try {
      setValidating(true);
      setValidatedData(null);
      setTicketValid(false);
      setMessage("");
      setMessageType("");

      const payload =
        scanned || cleanValue.startsWith("APARTMENT:")
          ? { qrData: cleanValue }
          : { ticketCode: cleanValue };

      const response = await axios.post(
        `${API_URL}/apartment-tickets/validate`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (
        !mountedRef.current ||
        requestId !== validationIdRef.current
      ) {
        return;
      }

      const result = response.data;

      setValidatedData(result.data || null);
      setTicketValid(result.valid === true);

      if (!result.valid) {
        showMessage(
          result.message ||
            "This apartment ticket cannot be used.",
          "warning"
        );
        return;
      }

      setTicketCode(
        result.data?.ticketCode ||
          cleanValue.replace(/^APARTMENT:/i, "")
      );

      showMessage(
        result.message ||
          "Apartment ticket validated successfully.",
        "success"
      );
    } catch (error) {
      if (
        !mountedRef.current ||
        requestId !== validationIdRef.current
      ) {
        return;
      }

      setValidatedData(
        error.response?.data?.data || null
      );
      setTicketValid(false);

      showMessage(
        error.response?.data?.message ||
          "Unable to validate this apartment ticket."
      );
    } finally {
      if (
        mountedRef.current &&
        requestId === validationIdRef.current
      ) {
        setValidating(false);
      }

      processingRef.current = false;
    }
  };

  const startScanner = async () => {
    if (
      cameraStarted ||
      startingRef.current ||
      scannerRef.current
    ) {
      return;
    }

    resetResult();

    startingRef.current = true;
    setStartingCamera(true);

    try {
      await queueScannerOperation(async () => {
        if (!startingRef.current || !mountedRef.current) {
          return;
        }

        const devices = await Html5Qrcode.getCameras();

        if (!devices || devices.length === 0) {
          throw new Error(
            "No camera was found on this device."
          );
        }

        if (!startingRef.current || !mountedRef.current) {
          return;
        }

        setCameras(devices);

        const preferredCamera =
          devices.find(
            (device) => device.id === selectedCamera
          ) ||
          devices.find((device) =>
            /back|rear|environment/i.test(device.label)
          ) ||
          devices[0];

        const cameraId = preferredCamera.id;

        setSelectedCamera(cameraId);

        const scanner = new Html5Qrcode(READER_ID, {
          verbose: false
        });

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
                    Math.floor(shortestSide * 0.7)
                  )
                );

                const safeSize = Math.min(
                  size,
                  shortestSide
                );

                return {
                  width: safeSize,
                  height: safeSize
                };
              },
              disableFlip: false
            },
            (decodedText) => {
              if (processingRef.current) return;

              const scannedValue = String(
                decodedText || ""
              ).trim();

              if (!scannedValue) return;

              processingRef.current = true;

              stopScanner()
                .then(() =>
                  validateTicket(scannedValue, true)
                )
                .catch((error) => {
                  console.error(
                    "QR scan processing error:",
                    error
                  );

                  processingRef.current = false;

                  showMessage(
                    "The QR code was detected, but verification could not be completed."
                  );
                });
            },
            () => {}
          );

          if (
            !startingRef.current ||
            !mountedRef.current
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
      console.error("Apartment scanner error:", error);

      showMessage(
        error.message ||
          "Unable to start the camera. Check camera permissions."
      );

      setCameraStarted(false);
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
    resetResult();
  };

  const handleManualValidation = async (event) => {
    event.preventDefault();

    if (validating || processingRef.current) {
      return;
    }

    await stopScanner();
    await validateTicket(ticketCode, false);
  };

  const handleCheckIn = async () => {
    if (
      !ticketValid ||
      !validatedData?.bookingId ||
      checkingIn
    ) {
      return;
    }

    const accessToken = getAccessToken();

    if (!accessToken) {
      showMessage(
        "Your session has expired. Please log in again."
      );
      return;
    }

    try {
      setCheckingIn(true);

      const response = await axios.patch(
        `${API_URL}/organizer/apartment-bookings/${validatedData.bookingId}/check-in`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const result = response.data;

      if (!mountedRef.current) return;

      const checkedInAt =
        result.data?.checkedInAt ||
        new Date().toISOString();

      setValidatedData((previous) => ({
        ...previous,
        stayStatus: "checked_in",
        checkedInAt
      }));

      setTicketValid(false);

      showMessage(
        result.message ||
          "Guest checked in successfully.",
        "success"
      );

      setScanHistory((previous) => [
        {
          ticketCode: validatedData.ticketCode,
          guest: getGuestName(validatedData),
          apartment:
            validatedData.apartment?.title ||
            "Apartment",
          category:
            validatedData.apartment?.apartmentType ||
            "",
          checkedInAt
        },
        ...previous
      ]);
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Unable to check in this guest."
      );
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

  const stayStatus = validatedData?.stayStatus;

  const alreadyCheckedIn =
    stayStatus === "checked_in";

  const alreadyCheckedOut =
    stayStatus === "checked_out";

  const usableTicket =
    ticketValid &&
    validatedData?.bookingId &&
    !alreadyCheckedIn &&
    !alreadyCheckedOut;

  const DetailItem = ({
    icon: Icon,
    label,
    value
  }) => (
    <div className="apartment-detail-item">
      <Icon size={17} />
      <div>
        <span>{label}</span>
        <strong>{value ?? "Not available"}</strong>
      </div>
    </div>
  );

  return (
    <div className="apartment-qr-page">
      <header className="apartment-qr-header">
        <button
          className="apartment-qr-brand"
          onClick={() =>
            navigate("/organizer/dashboard")
          }
        >
          <img src={vibelyLogo} alt="Vibely" />
        </button>

        <div className="apartment-header-center">
          <ShieldCheck size={15} />
          <span>Organizer Check-In Portal</span>
        </div>

        <button
          className="apartment-qr-back-button"
          onClick={() =>
            navigate("/organizer/check-in")
          }
        >
          <ArrowLeft size={16} />
          <span>Check-In Center</span>
        </button>
      </header>

      <main className="apartment-qr-main">
        <section className="apartment-qr-hero">
          <div className="apartment-hero-content">
            <div className="apartment-hero-badge">
              <Sparkles size={12} />
              APARTMENT OPERATIONS
            </div>

            <h1>
              Welcome guests with{" "}
              <span>confidence.</span>
            </h1>

            <p>
              Welcome back, {firstname}. Scan any valid
              apartment ticket from your Vibely listings
              and verify the guest, stay and payment
              before check-in.
            </p>

            <div className="apartment-hero-features">
              <div>
                <Building2 size={14} />
                <span>All your apartments</span>
              </div>

              <div>
                <ShieldCheck size={14} />
                <span>Ownership protected</span>
              </div>

              <div>
                <QrCode size={14} />
                <span>Secure guest access</span>
              </div>
            </div>
          </div>

          <div className="apartment-hero-art">
            <div className="apartment-hero-art-glow"></div>

            <div className="apartment-floating-ticket">
              <div className="apartment-floating-ticket-top">
                <div className="apartment-floating-icon">
                  <Building2 size={25} />
                </div>

                <div>
                  <span>VIBELY STAYS</span>
                  <strong>Guest Check-In</strong>
                </div>
              </div>

              <div className="apartment-ticket-dashes"></div>

              <div className="apartment-floating-ticket-bottom">
                <span>ACCESS</span>
                <strong>VERIFIED STAYS</strong>
                <QrCode size={31} />
              </div>
            </div>
          </div>
        </section>

        <section className="apartment-security-strip">
          <div className="apartment-security-strip-icon">
            <ShieldCheck size={19} />
          </div>

          <div>
            <strong>
              One scanner for every apartment you manage.
            </strong>

            <p>
              Vibely identifies the apartment and
              category automatically. Tickets for
              apartments belonging to another organizer
              are rejected.
            </p>
          </div>
        </section>

        <section className="apartment-workspace">
          <div className="apartment-scanner-panel">
            <div className="apartment-panel-heading">
              <div>
                <span className="apartment-section-label">
                  CAMERA SCANNER
                </span>

                <h2>Scan Stay Ticket</h2>

                <p>
                  Position the guest's QR code inside
                  the frame for secure verification.
                </p>
              </div>

              <div className="apartment-panel-heading-icon">
                <ScanLine size={21} />
              </div>
            </div>

            {cameras.length > 0 && (
              <div className="apartment-camera-field">
                <label htmlFor="apartment-camera-select">
                  Camera source
                </label>

                <div className="apartment-select-wrap">
                  <Camera size={15} />

                  <select
                    id="apartment-camera-select"
                    value={selectedCamera}
                    onChange={handleCameraChange}
                    disabled={
                      startingCamera || validating
                    }
                  >
                    {cameras.map((camera, index) => (
                      <option
                        key={camera.id}
                        value={camera.id}
                      >
                        {camera.label ||
                          `Camera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div
              className={`apartment-camera-area ${
                cameraStarted ? "active" : ""
              }`}
            >
             <div className="apartment-camera-preview">
  <div
    id={READER_ID}
    className="apartment-qr-reader"
  ></div>

  {cameraStarted && (
    <div className="apartment-qr-scan-overlay">
      <div className="apartment-qr-scan-box">
        <span className="qr-corner qr-top-left"></span>
        <span className="qr-corner qr-top-right"></span>
        <span className="qr-corner qr-bottom-left"></span>
        <span className="qr-corner qr-bottom-right"></span>

        <div className="apartment-qr-scan-line"></div>
      </div>

      <p>Align QR code within the frame</p>
    </div>
  )}
</div>

              {!cameraStarted && !startingCamera && (
                <div className="apartment-camera-placeholder">
                  <div className="apartment-scan-frame">
                    <span className="corner top-left"></span>
                    <span className="corner top-right"></span>
                    <span className="corner bottom-left"></span>
                    <span className="corner bottom-right"></span>

                  <div className="apartment-camera-icon">
  <QrCode size={48} />
</div>
                  </div>

                  <h3>Ready to scan</h3>

                  <p>
                    Start the camera and hold the guest's
                    apartment QR ticket inside the frame.
                  </p>
                </div>
              )}

              {startingCamera && (
                <div className="apartment-camera-loading">
                  <Camera size={28} />
                  <p>Starting camera...</p>
                </div>
              )}
            </div>

            {!cameraStarted ? (
              <button
                className="apartment-primary-button"
                onClick={startScanner}
                disabled={startingCamera || validating}
              >
                <Camera size={17} />

                {startingCamera
                  ? "Starting Camera..."
                  : "Start Camera"}

                {!startingCamera && (
                  <ArrowRight size={16} />
                )}
              </button>
            ) : (
              <button
                className="apartment-stop-button"
                onClick={stopScanner}
              >
                <Camera size={17} />
                Stop Camera
              </button>
            )}

            <div className="apartment-divider">
              OR ENTER TICKET MANUALLY
            </div>

            <form
              className="apartment-manual-form"
              onSubmit={handleManualValidation}
            >
              <label htmlFor="apartment-ticket-code">
                Apartment ticket code
              </label>

              <div className="apartment-manual-input-wrap">
                <Keyboard size={16} />

                <input
                  id="apartment-ticket-code"
                  type="text"
                  value={ticketCode}
                  onChange={(event) =>
                    setTicketCode(event.target.value)
                  }
                  placeholder="APT-TKT-..."
                />
              </div>

              <button
                type="submit"
                className="apartment-validate-button"
                disabled={
                  validating ||
                  checkingIn ||
                  !ticketCode.trim()
                }
              >
                <QrCode size={17} />

                {validating
                  ? "Validating Ticket..."
                  : "Validate Ticket"}
              </button>
            </form>
          </div>

          <div className="apartment-result-panel">
            <div className="apartment-panel-heading">
              <div>
                <span className="apartment-section-label">
                  GUEST VERIFICATION
                </span>

                <h2>Stay Details</h2>

                <p>
                  Verify the guest, apartment, dates
                  and payment before granting access.
                </p>
              </div>

              <div className="apartment-panel-heading-icon">
                <ShieldCheck size={21} />
              </div>
            </div>

            {!validatedData && !message && (
              <div className="apartment-empty-result">
                <div className="apartment-empty-visual">
                  <div className="apartment-empty-circle">
                    <QrCode size={37} />
                  </div>

                  <span className="apartment-empty-dot dot-one"></span>
                  <span className="apartment-empty-dot dot-two"></span>
                  <span className="apartment-empty-dot dot-three"></span>
                </div>

                <h3>Waiting for a stay ticket</h3>

                <p>
                  Scan an apartment QR code or enter
                  a ticket code. Guest and stay details
                  will appear here automatically.
                </p>

                <div className="apartment-empty-secure">
                  <ShieldCheck size={13} />
                  Organizer ownership is verified
                </div>
              </div>
            )}

            {message && (
              <div
                className={`apartment-message ${messageType}`}
                role="status"
              >
                <div className="apartment-message-icon">
                  {messageType === "success" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <CircleAlert size={18} />
                  )}
                </div>

                <span>{message}</span>
              </div>
            )}

            {validatedData && (
              <div className="apartment-ticket-result">
                <div
                  className={`apartment-validation-banner ${
                    !ticketValid ||
                    alreadyCheckedIn ||
                    alreadyCheckedOut
                      ? "used"
                      : "valid"
                  }`}
                >
                  <div className="apartment-validation-icon">
                    {!ticketValid ||
                    alreadyCheckedIn ||
                    alreadyCheckedOut ? (
                      <CircleAlert size={19} />
                    ) : (
                      <CheckCircle2 size={19} />
                    )}
                  </div>

                  <div>
                    <span>
                      {alreadyCheckedOut
                        ? "STAY COMPLETED"
                        : alreadyCheckedIn
                        ? "ACCESS ALREADY GRANTED"
                        : ticketValid
                        ? "BOOKING VERIFIED"
                        : "TICKET NOT VALID"}
                    </span>

                    <strong>
                      {alreadyCheckedOut
                        ? "Guest has already checked out"
                        : alreadyCheckedIn
                        ? "Guest is currently checked in"
                        : ticketValid
                        ? "Valid apartment booking"
                        : "This ticket cannot be used for check-in"}
                    </strong>
                  </div>
                </div>

                <div className="apartment-guest-card">
                  <div className="apartment-guest-avatar">
                    <UserRound size={21} />
                  </div>

                  <div className="apartment-guest-info">
                    <span>PRIMARY GUEST</span>
                    <h3>
                      {getGuestName(validatedData)}
                    </h3>
                    <p>
                      {getGuestEmail(validatedData)}
                    </p>
                  </div>

                  <div
                    className={`apartment-status-pill ${
                      !ticketValid ||
                      alreadyCheckedIn ||
                      alreadyCheckedOut
                        ? "used"
                        : "valid"
                    }`}
                  >
                    {alreadyCheckedOut
                      ? "Checked Out"
                      : alreadyCheckedIn
                      ? "Checked In"
                      : ticketValid
                      ? "Valid"
                      : "Invalid"}
                  </div>
                </div>

                <div className="apartment-stay-highlight">
                  <div className="apartment-stay-highlight-icon">
                    <Building2 size={20} />
                  </div>

                  <div>
                    <span>VERIFIED STAY</span>

                    <strong>
                      {validatedData.apartment?.title ||
                        "Apartment"}
                    </strong>

                    <small>
                      {formatCategory(
                        validatedData.apartment
                          ?.apartmentType
                      )}
                    </small>
                  </div>
                </div>

                <div className="apartment-detail-list">
                  <DetailItem
                    icon={MapPin}
                    label="Location"
                    value={
                      validatedData.apartment
                        ?.location || "Not available"
                    }
                  />

                  <DetailItem
                    icon={QrCode}
                    label="Ticket Code"
                    value={
                      validatedData.ticketCode ||
                      "Not available"
                    }
                  />

                  <DetailItem
                    icon={ShieldCheck}
                    label="Booking Reference"
                    value={
                      validatedData.bookingReference ||
                      "Not available"
                    }
                  />

                  <DetailItem
                    icon={BedDouble}
                    label="Stay Type"
                    value={formatStayType(
                      validatedData.stayType
                    )}
                  />

                  <DetailItem
                    icon={Home}
                    label="Units"
                    value={
                      validatedData.numberOfUnits ??
                      "Not available"
                    }
                  />

                  <DetailItem
                    icon={CalendarDays}
                    label="Check-In"
                    value={formatDate(
                      validatedData.checkInDate
                    )}
                  />

                  <DetailItem
                    icon={CalendarDays}
                    label="Check-Out"
                    value={formatDate(
                      validatedData.checkOutDate
                    )}
                  />

                  {validatedData.expectedCheckInTime && (
                    <DetailItem
                      icon={Clock}
                      label="Expected Arrival"
                      value={
                        validatedData.expectedCheckInTime
                      }
                    />
                  )}

                  <DetailItem
                    icon={CreditCard}
                    label="Amount"
                    value={formatMoney(
                      validatedData.totalAmount
                    )}
                  />

                  <DetailItem
                    icon={CheckCircle2}
                    label="Payment"
                    value={formatCategory(
                      validatedData.paymentStatus
                    )}
                  />
                </div>

                {usableTicket && (
                  <button
                    className="apartment-checkin-button"
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                  >
                    <CheckCircle2 size={18} />

                    {checkingIn
                      ? "Checking In Guest..."
                      : "Check In Guest"}

                    {!checkingIn && (
                      <ArrowRight size={16} />
                    )}
                  </button>
                )}

                {alreadyCheckedIn &&
                  validatedData.checkedInAt && (
                    <div className="apartment-checked-time">
                      <CheckCircle2 size={18} />

                      <div>
                        <span>Guest checked in</span>
                        <strong>
                          {formatDateTime(
                            validatedData.checkedInAt
                          )}
                        </strong>
                      </div>
                    </div>
                  )}

                {alreadyCheckedOut &&
                  validatedData.checkedOutAt && (
                    <div className="apartment-checked-time">
                      <CheckCircle2 size={18} />

                      <div>
                        <span>Guest checked out</span>
                        <strong>
                          {formatDateTime(
                            validatedData.checkedOutAt
                          )}
                        </strong>
                      </div>
                    </div>
                  )}

                <button
                  className="apartment-scan-another-button"
                  onClick={handleScanAnother}
                >
                  <RotateCcw size={16} />
                  Scan Another Ticket
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="apartment-help-strip">
          <div>
            <div className="apartment-help-icon">
              <ShieldCheck size={18} />
            </div>

            <div>
              <strong>
                Secure organizer verification
              </strong>

              <p>
                Apartment ownership, booking and
                payment are checked before access
                is granted.
              </p>
            </div>
          </div>

          <span>
            One apartment scanner works across
            Budget, Standard and Luxury listings
            owned by your organizer account.
          </span>
        </section>

        {scanHistory.length > 0 && (
          <section className="apartment-history">
            <div className="apartment-history-heading">
              <div>
                <span className="apartment-section-label">
                  THIS SESSION
                </span>

                <h2>Recent Apartment Check-Ins</h2>

                <p>
                  Guests successfully admitted
                  during this scanner session.
                </p>
              </div>

              <div className="apartment-history-count">
                {scanHistory.length}
              </div>
            </div>

            <div className="apartment-history-list">
              {scanHistory.map((item, index) => (
                <div
                  className="apartment-history-item"
                  key={`${item.ticketCode}-${index}`}
                >
                  <div className="apartment-history-success">
                    <CheckCircle2 size={17} />
                  </div>

                  <div className="apartment-history-person">
                    <strong>{item.guest}</strong>

                    <span>
                      {item.apartment} •{" "}
                      {formatCategory(item.category)}
                    </span>
                  </div>

                  <div className="apartment-history-code">
                    <strong>{item.ticketCode}</strong>

                    <span>
                      {formatDateTime(
                        item.checkedInAt
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default ApartmentQRCheckIn;
