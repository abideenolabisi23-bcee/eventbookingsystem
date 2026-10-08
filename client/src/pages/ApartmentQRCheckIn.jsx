import React, {
  useEffect,
  useRef,
  useState
} from "react";

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

const ApartmentQRCheckIn = () => {
  const navigate = useNavigate();

  const scannerRef = useRef(null);
  const processingRef = useRef(false);

  const [ticketCode, setTicketCode] = useState("");
  const [validatedData, setValidatedData] = useState(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [validating, setValidating] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);

  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");

  const [scanHistory, setScanHistory] = useState([]);

  const accessToken =
    localStorage.getItem("accessToken");

  const firstname =
    localStorage.getItem("firstname") || "Organizer";

  const stopScanner = async () => {
    try {
      if (
        scannerRef.current &&
        scannerRef.current.isScanning
      ) {
        await scannerRef.current.stop();
      }

      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
        } catch {
          scannerRef.current = null;
        }
      }
    } catch {
      scannerRef.current = null;
    } finally {
      scannerRef.current = null;
      setCameraStarted(false);
    }
  };

  useEffect(() => {
    const loadCameras = async () => {
      try {
        const devices =
          await Html5Qrcode.getCameras();

        setCameras(devices || []);

        if (devices && devices.length > 0) {
          const backCamera =
            devices.find((camera) =>
              /back|rear|environment/i.test(
                camera.label
              )
            ) || devices[devices.length - 1];

          setSelectedCamera(backCamera.id);
        }
      } catch {
        setCameras([]);
      }
    };

    loadCameras();

    return () => {
      if (
        scannerRef.current &&
        scannerRef.current.isScanning
      ) {
        scannerRef.current
          .stop()
          .catch(() => {});
      }
    };
  }, []);

  const resetResult = () => {
    setValidatedData(null);
    setMessage("");
    setMessageType("");
  };

  const validateTicket = async (
    value,
    scanned = false
  ) => {
    const cleanValue = String(
      value || ""
    ).trim();

    if (!cleanValue) {
      setMessage(
        "Enter an apartment ticket code first."
      );
      setMessageType("error");
      return;
    }

    if (!accessToken) {
      setMessage(
        "Your session has expired. Please login again."
      );
      setMessageType("error");
      return;
    }

    try {
      setValidating(true);
      setValidatedData(null);
      setMessage("");
      setMessageType("");

      const payload =
        scanned ||
        cleanValue.startsWith("APARTMENT:")
          ? {
              qrData: cleanValue
            }
          : {
              ticketCode: cleanValue
            };

      const response = await axios.post(
        `${API_URL}/apartment-tickets/validate`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const result = response.data;

      setValidatedData(
        result.data || null
      );

      if (!result.valid) {
        setMessage(
          result.message ||
            "This apartment ticket cannot be used."
        );
        setMessageType("warning");
        return;
      }

      setMessage(
        result.message ||
          "Apartment ticket validated successfully."
      );

      setMessageType("success");

      setTicketCode(
        result.data?.ticketCode ||
          cleanValue.replace(
            "APARTMENT:",
            ""
          )
      );
    } catch (error) {
      setValidatedData(
        error.response?.data?.data || null
      );

      setMessage(
        error.response?.data?.message ||
          "Unable to validate this apartment ticket."
      );

      setMessageType("error");
    } finally {
      setValidating(false);
      processingRef.current = false;
    }
  };

  const startScanner = async () => {
    if (
      cameraStarted ||
      startingCamera
    ) {
      return;
    }

    resetResult();

    try {
      setStartingCamera(true);

      let cameraId = selectedCamera;

      if (!cameraId) {
        const devices =
          await Html5Qrcode.getCameras();

        setCameras(devices || []);

        if (
          !devices ||
          devices.length === 0
        ) {
          throw new Error(
            "No camera was found on this device."
          );
        }

        const preferredCamera =
          devices.find((camera) =>
            /back|rear|environment/i.test(
              camera.label
            )
          ) || devices[devices.length - 1];

        cameraId = preferredCamera.id;

        setSelectedCamera(cameraId);
      }

      const scanner =
        new Html5Qrcode(
          "apartment-organizer-qr-reader"
        );

      scannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250
          },
          aspectRatio: 1
        },
        async (decodedText) => {
          if (processingRef.current) {
            return;
          }

          processingRef.current = true;

          await stopScanner();

          await validateTicket(
            decodedText,
            true
          );
        },
        () => {}
      );

      setCameraStarted(true);
    } catch (error) {
      setMessage(
        error.message ||
          "Unable to start the camera."
      );

      setMessageType("error");
      setCameraStarted(false);
      scannerRef.current = null;
    } finally {
      setStartingCamera(false);
    }
  };

  const handleCameraChange =
    async (event) => {
      const cameraId =
        event.target.value;

      if (cameraStarted) {
        await stopScanner();
      }

      setSelectedCamera(cameraId);
    };

  const handleManualValidation =
    async (event) => {
      event.preventDefault();

      await validateTicket(
        ticketCode,
        false
      );
    };

  const handleCheckIn = async () => {
    if (!validatedData?.bookingId) {
      return;
    }

    try {
      setCheckingIn(true);

      const response =
        await axios.patch(
          `${API_URL}/organizer/apartment-bookings/${validatedData.bookingId}/check-in`,
          {},
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`
            }
          }
        );

      const result = response.data;

      const checkedInAt =
        result.data?.checkedInAt ||
        new Date().toISOString();

      setMessage(
        result.message ||
          "Guest checked in successfully."
      );

      setMessageType("success");

      setValidatedData(
        (previous) => ({
          ...previous,
          stayStatus: "checked_in",
          checkedInAt
        })
      );

      setScanHistory(
        (previous) => [
          {
            ticketCode:
              validatedData.ticketCode,
            guest:
              getGuestName(
                validatedData
              ),
            apartment:
              validatedData.apartment
                ?.title ||
              "Apartment",
            category:
              validatedData.apartment
                ?.apartmentType ||
              "",
            checkedInAt
          },
          ...previous
        ]
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to check in this guest."
      );

      setMessageType("error");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleScanAnother =
    async () => {
      await stopScanner();

      processingRef.current = false;

      setTicketCode("");
      setValidatedData(null);
      setMessage("");
      setMessageType("");
    };

  const getGuestName = (data) => {
    const guest = data?.guest;

    if (!guest) {
      return "Guest";
    }

    const name = [
      guest.firstname,
      guest.lastname
    ]
      .filter(Boolean)
      .join(" ");

    return (
      name ||
      guest.email ||
      "Guest"
    );
  };

  const getGuestEmail = (data) => {
    return (
      data?.guest?.email ||
      "Guest information verified"
    );
  };

  const formatCategory = (value) => {
    if (!value) {
      return "Not available";
    }

    return value
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  };

  const formatStayType = (value) => {
    if (value === "day_use") {
      return "Day Use";
    }

    if (value === "overnight") {
      return "Overnight";
    }

    return formatCategory(value);
  };

  const formatDate = (value) => {
    if (!value) {
      return "Not available";
    }

    return new Date(
      value
    ).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "Not available";
    }

    return new Date(
      value
    ).toLocaleString(
      "en-NG",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );
  };

  const formatMoney = (value) => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return "Not available";
    }

    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
      }
    ).format(amount);
  };

  const stayStatus =
    validatedData?.stayStatus;

  const alreadyCheckedIn =
    stayStatus === "checked_in";

  const alreadyCheckedOut =
    stayStatus === "checked_out";

  const usableTicket =
    validatedData &&
    !alreadyCheckedIn &&
    !alreadyCheckedOut &&
    validatedData.bookingId;

  return (
    <div className="apartment-qr-page">
      <header className="apartment-qr-header">
        <button
          className="apartment-qr-brand"
          onClick={() =>
            navigate(
              "/organizer/dashboard"
            )
          }
        >
          <img
            src={vibelyLogo}
            alt="Vibely"
          />
        </button>

        <div className="apartment-header-center">
          <ShieldCheck size={15} />
          <span>
            Organizer Check-In Portal
          </span>
        </div>

        <button
          className="apartment-qr-back-button"
          onClick={() =>
            navigate(
              "/organizer/check-in"
            )
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
              Welcome back, {firstname}.
              Scan any valid apartment
              ticket from your Vibely
              listings and verify the
              guest, stay and payment
              before check-in.
            </p>

            <div className="apartment-hero-features">
              <div>
                <Building2 size={14} />
                <span>
                  All your apartments
                </span>
              </div>

              <div>
                <ShieldCheck size={14} />
                <span>
                  Ownership protected
                </span>
              </div>

              <div>
                <QrCode size={14} />
                <span>
                  Secure guest access
                </span>
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
                  <span>
                    VIBELY STAYS
                  </span>
                  <strong>
                    Guest Check-In
                  </strong>
                </div>
              </div>

              <div className="apartment-ticket-dashes"></div>

              <div className="apartment-floating-ticket-bottom">
                <span>
                  ACCESS
                </span>

                <strong>
                  VERIFIED STAYS
                </strong>

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
              One scanner for every
              apartment you manage.
            </strong>

            <p>
              Vibely identifies the
              apartment and category
              automatically. Tickets
              for apartments belonging
              to another organizer are
              rejected.
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

                <h2>
                  Scan Stay Ticket
                </h2>

                <p>
                  Position the guest's
                  QR code inside the
                  frame for secure
                  verification.
                </p>
              </div>

              <div className="apartment-panel-heading-icon">
                <ScanLine size={21} />
              </div>
            </div>

            {cameras.length > 0 && (
              <div className="apartment-camera-field">
                <label>
                  Camera source
                </label>

                <div className="apartment-select-wrap">
                  <Camera size={15} />

                  <select
                    value={selectedCamera}
                    onChange={
                      handleCameraChange
                    }
                  >
                    {cameras.map(
                      (
                        camera,
                        index
                      ) => (
                        <option
                          key={
                            camera.id
                          }
                          value={
                            camera.id
                          }
                        >
                          {camera.label ||
                            `Camera ${
                              index + 1
                            }`}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            )}

            <div
              className={`apartment-camera-area ${
                cameraStarted
                  ? "active"
                  : ""
              }`}
            >
              <div
                id="apartment-organizer-qr-reader"
                className="apartment-qr-reader"
              ></div>

              {!cameraStarted && (
                <div className="apartment-camera-placeholder">
                  <div className="apartment-scan-frame">
                    <span className="corner top-left"></span>
                    <span className="corner top-right"></span>
                    <span className="corner bottom-left"></span>
                    <span className="corner bottom-right"></span>

                    <div className="apartment-camera-icon">
                      <Camera
                        size={34}
                      />
                    </div>
                  </div>

                  <h3>
                    Ready to scan
                  </h3>

                  <p>
                    Start the camera
                    and hold the
                    guest's apartment
                    QR ticket inside
                    the frame.
                  </p>
                </div>
              )}
            </div>

            {!cameraStarted ? (
              <button
                className="apartment-primary-button"
                onClick={startScanner}
                disabled={
                  startingCamera
                }
              >
                <Camera size={17} />

                {startingCamera
                  ? "Starting Camera..."
                  : "Start Camera"}

                {!startingCamera && (
                  <ArrowRight
                    size={16}
                  />
                )}
              </button>
            ) : (
              <button
                className="apartment-stop-button"
                onClick={
                  stopScanner
                }
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
              onSubmit={
                handleManualValidation
              }
            >
              <label>
                Apartment ticket code
              </label>

              <div className="apartment-manual-input-wrap">
                <Keyboard
                  size={16}
                />

                <input
                  type="text"
                  value={ticketCode}
                  onChange={(event) =>
                    setTicketCode(
                      event.target.value
                    )
                  }
                  placeholder="APT-TKT-..."
                />
              </div>

              <button
                type="submit"
                className="apartment-validate-button"
                disabled={validating}
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

                <h2>
                  Stay Details
                </h2>

                <p>
                  Verify the guest,
                  apartment, dates and
                  payment before
                  granting access.
                </p>
              </div>

              <div className="apartment-panel-heading-icon">
                <ShieldCheck
                  size={21}
                />
              </div>
            </div>

            {!validatedData &&
              !message && (
                <div className="apartment-empty-result">
                  <div className="apartment-empty-visual">
                    <div className="apartment-empty-circle">
                      <QrCode
                        size={37}
                      />
                    </div>

                    <span className="apartment-empty-dot dot-one"></span>
                    <span className="apartment-empty-dot dot-two"></span>
                    <span className="apartment-empty-dot dot-three"></span>
                  </div>

                  <h3>
                    Waiting for a
                    stay ticket
                  </h3>

                  <p>
                    Scan an apartment
                    QR code or enter a
                    ticket code. Guest
                    and stay details
                    will appear here
                    automatically.
                  </p>

                  <div className="apartment-empty-secure">
                    <ShieldCheck
                      size={13}
                    />
                    Organizer ownership
                    is verified
                  </div>
                </div>
              )}

            {message && (
              <div
                className={`apartment-message ${messageType}`}
              >
                <div className="apartment-message-icon">
                  {messageType ===
                  "success" ? (
                    <CheckCircle2
                      size={18}
                    />
                  ) : (
                    <CircleAlert
                      size={18}
                    />
                  )}
                </div>

                <span>
                  {message}
                </span>
              </div>
            )}

            {validatedData && (
              <div className="apartment-ticket-result">
                <div
                  className={`apartment-validation-banner ${
                    alreadyCheckedIn ||
                    alreadyCheckedOut
                      ? "used"
                      : "valid"
                  }`}
                >
                  <div className="apartment-validation-icon">
                    {alreadyCheckedIn ||
                    alreadyCheckedOut ? (
                      <CircleAlert
                        size={19}
                      />
                    ) : (
                      <CheckCircle2
                        size={19}
                      />
                    )}
                  </div>

                  <div>
                    <span>
                      {alreadyCheckedOut
                        ? "STAY COMPLETED"
                        : alreadyCheckedIn
                        ? "ACCESS ALREADY GRANTED"
                        : "BOOKING VERIFIED"}
                    </span>

                    <strong>
                      {alreadyCheckedOut
                        ? "Guest has already checked out"
                        : alreadyCheckedIn
                        ? "Guest is currently checked in"
                        : "Valid apartment booking"}
                    </strong>
                  </div>
                </div>

                <div className="apartment-guest-card">
                  <div className="apartment-guest-avatar">
                    <UserRound
                      size={21}
                    />
                  </div>

                  <div className="apartment-guest-info">
                    <span>
                      PRIMARY GUEST
                    </span>

                    <h3>
                      {getGuestName(
                        validatedData
                      )}
                    </h3>

                    <p>
                      {getGuestEmail(
                        validatedData
                      )}
                    </p>
                  </div>

                  <div
                    className={`apartment-status-pill ${
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
                      : "Valid"}
                  </div>
                </div>

                <div className="apartment-stay-highlight">
                  <div className="apartment-stay-highlight-icon">
                    <Building2
                      size={20}
                    />
                  </div>

                  <div>
                    <span>
                      VERIFIED STAY
                    </span>

                    <strong>
                      {validatedData
                        .apartment
                        ?.title ||
                        "Apartment"}
                    </strong>

                    <small>
                      {formatCategory(
                        validatedData
                          .apartment
                          ?.apartmentType
                      )}
                    </small>
                  </div>
                </div>

                <div className="apartment-detail-list">
                  <div className="apartment-detail-item">
                    <MapPin
                      size={17}
                    />

                    <div>
                      <span>
                        Location
                      </span>

                      <strong>
                        {validatedData
                          .apartment
                          ?.location ||
                          "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-detail-item">
                    <QrCode
                      size={17}
                    />

                    <div>
                      <span>
                        Ticket Code
                      </span>

                      <strong>
                        {validatedData.ticketCode ||
                          "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-detail-item">
                    <ShieldCheck
                      size={17}
                    />

                    <div>
                      <span>
                        Booking Reference
                      </span>

                      <strong>
                        {validatedData.bookingReference ||
                          "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-detail-item">
                    <BedDouble
                      size={17}
                    />

                    <div>
                      <span>
                        Stay Type
                      </span>

                      <strong>
                        {formatStayType(
                          validatedData.stayType
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-detail-item">
                    <Home
                      size={17}
                    />

                    <div>
                      <span>
                        Units
                      </span>

                      <strong>
                        {validatedData.numberOfUnits ??
                          "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-detail-item">
                    <CalendarDays
                      size={17}
                    />

                    <div>
                      <span>
                        Check-In
                      </span>

                      <strong>
                        {formatDate(
                          validatedData.checkInDate
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-detail-item">
                    <CalendarDays
                      size={17}
                    />

                    <div>
                      <span>
                        Check-Out
                      </span>

                      <strong>
                        {formatDate(
                          validatedData.checkOutDate
                        )}
                      </strong>
                    </div>
                  </div>

                  {validatedData.expectedCheckInTime && (
                    <div className="apartment-detail-item">
                      <Clock
                        size={17}
                      />

                      <div>
                        <span>
                          Expected Arrival
                        </span>

                        <strong>
                          {validatedData.expectedCheckInTime}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="apartment-detail-item">
                    <CreditCard
                      size={17}
                    />

                    <div>
                      <span>
                        Amount
                      </span>

                      <strong>
                        {formatMoney(
                          validatedData.totalAmount
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-detail-item">
                    <CheckCircle2
                      size={17}
                    />

                    <div>
                      <span>
                        Payment
                      </span>

                      <strong>
                        {formatCategory(
                          validatedData.paymentStatus
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                {usableTicket && (
                  <button
                    className="apartment-checkin-button"
                    onClick={
                      handleCheckIn
                    }
                    disabled={
                      checkingIn
                    }
                  >
                    <CheckCircle2
                      size={18}
                    />

                    {checkingIn
                      ? "Checking In Guest..."
                      : "Check In Guest"}

                    {!checkingIn && (
                      <ArrowRight
                        size={16}
                      />
                    )}
                  </button>
                )}

                {alreadyCheckedIn &&
                  validatedData.checkedInAt && (
                    <div className="apartment-checked-time">
                      <CheckCircle2
                        size={18}
                      />

                      <div>
                        <span>
                          Guest checked in
                        </span>

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
                      <CheckCircle2
                        size={18}
                      />

                      <div>
                        <span>
                          Guest checked out
                        </span>

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
                  onClick={
                    handleScanAnother
                  }
                >
                  <RotateCcw
                    size={16}
                  />
                  Scan Another Ticket
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="apartment-help-strip">
          <div>
            <div className="apartment-help-icon">
              <ShieldCheck
                size={18}
              />
            </div>

            <div>
              <strong>
                Secure organizer
                verification
              </strong>

              <p>
                Apartment ownership,
                booking and payment
                are checked before
                access is granted.
              </p>
            </div>
          </div>

          <span>
            One apartment scanner
            works across Budget,
            Standard and Luxury
            listings owned by your
            organizer account.
          </span>
        </section>

        {scanHistory.length > 0 && (
          <section className="apartment-history">
            <div className="apartment-history-heading">
              <div>
                <span className="apartment-section-label">
                  THIS SESSION
                </span>

                <h2>
                  Recent Apartment
                  Check-Ins
                </h2>

                <p>
                  Guests successfully
                  admitted during this
                  scanner session.
                </p>
              </div>

              <div className="apartment-history-count">
                {scanHistory.length}
              </div>
            </div>

            <div className="apartment-history-list">
              {scanHistory.map(
                (item, index) => (
                  <div
                    className="apartment-history-item"
                    key={`${item.ticketCode}-${index}`}
                  >
                    <div className="apartment-history-success">
                      <CheckCircle2
                        size={17}
                      />
                    </div>

                    <div className="apartment-history-person">
                      <strong>
                        {item.guest}
                      </strong>

                      <span>
                        {item.apartment} •{" "}
                        {formatCategory(
                          item.category
                        )}
                      </span>
                    </div>

                    <div className="apartment-history-code">
                      <strong>
                        {item.ticketCode}
                      </strong>

                      <span>
                        {formatDateTime(
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

export default ApartmentQRCheckIn;