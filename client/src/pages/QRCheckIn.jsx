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
  Building2,
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
  UserRound,
  BedDouble,
  CalendarDays
} from "lucide-react";
import "../styles/apartmentQRCheckIn.css";
import vibelyLogo from "../assets/vibely-logo.png";

const API_URL =
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const ApartmentQRCheckIn = () => {
  const navigate = useNavigate();

  const scannerRef = useRef(null);
  const processingRef = useRef(false);

  const [ticketCode, setTicketCode] =
    useState("");

  const [validatedData, setValidatedData] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("");

  const [validating, setValidating] =
    useState(false);

  const [checkingIn, setCheckingIn] =
    useState(false);

  const [cameraStarted, setCameraStarted] =
    useState(false);

  const [startingCamera, setStartingCamera] =
    useState(false);

  const [cameras, setCameras] =
    useState([]);

  const [selectedCamera, setSelectedCamera] =
    useState("");

  const [scanHistory, setScanHistory] =
    useState([]);

  const accessToken =
    localStorage.getItem("accessToken");

  const firstname =
    localStorage.getItem("firstname") ||
    "Organizer";

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

        if (
          devices &&
          devices.length > 0
        ) {
          const backCamera =
            devices.find((camera) =>
              /back|rear|environment/i.test(
                camera.label
              )
            ) ||
            devices[
              devices.length - 1
            ];

          setSelectedCamera(
            backCamera.id
          );
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
        cleanValue.startsWith(
          "APARTMENT:"
        )
          ? {
              qrData: cleanValue
            }
          : {
              ticketCode:
                cleanValue
            };

      const response =
        await axios.post(
          `${API_URL}/apartment-tickets/validate`,
          payload,
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`
            }
          }
        );

      const result =
        response.data;

      setValidatedData(
        result.data || null
      );

      if (!result.valid) {
        setMessage(
          result.message ||
            "This apartment ticket cannot be used."
        );

        setMessageType(
          "warning"
        );

        return;
      }

      setMessage(
        result.message ||
          "Apartment ticket validated successfully."
      );

      setMessageType(
        "success"
      );

      setTicketCode(
        result.data?.ticketCode ||
          cleanValue.replace(
            "APARTMENT:",
            ""
          )
      );
    } catch (error) {
      setValidatedData(
        error.response?.data
          ?.data || null
      );

      setMessage(
        error.response?.data
          ?.message ||
          "Unable to validate this apartment ticket."
      );

      setMessageType(
        "error"
      );
    } finally {
      setValidating(false);
      processingRef.current =
        false;
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

      let cameraId =
        selectedCamera;

      if (!cameraId) {
        const devices =
          await Html5Qrcode.getCameras();

        setCameras(
          devices || []
        );

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
          ) ||
          devices[
            devices.length - 1
          ];

        cameraId =
          preferredCamera.id;

        setSelectedCamera(
          cameraId
        );
      }

      const scanner =
        new Html5Qrcode(
          "apartment-organizer-qr-reader"
        );

      scannerRef.current =
        scanner;

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
        async (
          decodedText
        ) => {
          if (
            processingRef.current
          ) {
            return;
          }

          processingRef.current =
            true;

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

      setMessageType(
        "error"
      );

      setCameraStarted(false);
      scannerRef.current =
        null;
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

      setSelectedCamera(
        cameraId
      );
    };

  const handleManualValidation =
    async (event) => {
      event.preventDefault();

      await validateTicket(
        ticketCode,
        false
      );
    };

  const handleCheckIn =
    async () => {
      if (
        !validatedData?.bookingId
      ) {
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

        const result =
          response.data;

        const checkedInAt =
          result.data
            ?.checkedInAt ||
          new Date().toISOString();

        setMessage(
          result.message ||
            "Guest checked in successfully."
        );

        setMessageType(
          "success"
        );

        setValidatedData(
          (previous) => ({
            ...previous,
            stayStatus:
              "checked_in",
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
                validatedData
                  .apartment
                  ?.title ||
                "Apartment",
              category:
                validatedData
                  .apartment
                  ?.apartmentType ||
                "",
              checkedInAt
            },
            ...previous
          ]
        );
      } catch (error) {
        setMessage(
          error.response?.data
            ?.message ||
            "Unable to check in this guest."
        );

        setMessageType(
          "error"
        );
      } finally {
        setCheckingIn(false);
      }
    };

  const handleScanAnother =
    async () => {
      await stopScanner();

      processingRef.current =
        false;

      setTicketCode("");
      setValidatedData(null);
      setMessage("");
      setMessageType("");
    };

  const getGuestName = (
    data
  ) => {
    const guest =
      data?.guest;

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

  const formatCategory = (
    value
  ) => {
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

  const formatStayType = (
    value
  ) => {
    if (
      value === "day_use"
    ) {
      return "Day Use";
    }

    if (
      value === "overnight"
    ) {
      return "Overnight";
    }

    return formatCategory(
      value
    );
  };

  const formatDate = (
    value
  ) => {
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

  const formatDateTime = (
    value
  ) => {
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

  const formatMoney = (
    value
  ) => {
    const amount =
      Number(value);

    if (
      !Number.isFinite(amount)
    ) {
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
    stayStatus ===
    "checked_in";

  const alreadyCheckedOut =
    stayStatus ===
    "checked_out";

  return (
    <div className="apartment-qr-page">
      <header className="apartment-qr-header">
        <div
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
        </div>

        <button
          className="apartment-qr-back"
          onClick={() =>
            navigate(
              "/organizer/check-in"
            )
          }
        >
          <ArrowLeft
            size={18}
          />
          Check-In Center
        </button>
      </header>

      <main className="apartment-qr-main">
        <section className="apartment-qr-heading">
          <div className="apartment-qr-heading-icon">
            <Building2
              size={28}
            />
          </div>

          <div>
            <p className="apartment-qr-eyebrow">
              APARTMENT OPERATIONS
            </p>

            <h1>
              Apartment Scanner
            </h1>

            <p>
              Welcome,{" "}
              {firstname}. Scan a
              booking ticket from
              any apartment
              belonging to your
              organizer account.
            </p>
          </div>
        </section>

        <section className="apartment-qr-security">
          <ShieldCheck
            size={21}
          />

          <div>
            <strong>
              One scanner for all
              your apartments
            </strong>

            <p>
              Vibely identifies
              the apartment and
              category
              automatically.
              Tickets belonging
              to another
              organizer are
              rejected.
            </p>
          </div>
        </section>

        <div className="apartment-qr-grid">
          <section className="apartment-qr-card">
            <div className="apartment-qr-card-heading">
              <div>
                <p>
                  CAMERA SCANNER
                </p>

                <h2>
                  Scan Apartment QR
                </h2>
              </div>

              <ScanLine
                size={25}
              />
            </div>

            {cameras.length >
              0 && (
              <div className="apartment-camera-field">
                <label>
                  Select camera
                </label>

                <select
                  value={
                    selectedCamera
                  }
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
                            index +
                            1
                          }`}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            <div className="apartment-camera-area">
              <div
                id="apartment-organizer-qr-reader"
                className="apartment-qr-reader"
              ></div>

              {!cameraStarted && (
                <div className="apartment-camera-placeholder">
                  <div className="apartment-camera-icon">
                    <Camera
                      size={35}
                    />
                  </div>

                  <h3>
                    Camera is not
                    running
                  </h3>

                  <p>
                    Start the
                    camera and
                    place the
                    guest's
                    apartment QR
                    code inside
                    the scanner.
                  </p>
                </div>
              )}
            </div>

            {!cameraStarted ? (
              <button
                className="apartment-primary-button"
                onClick={
                  startScanner
                }
                disabled={
                  startingCamera
                }
              >
                <Camera
                  size={18}
                />

                {startingCamera
                  ? "Starting Camera..."
                  : "Start Camera"}
              </button>
            ) : (
              <button
                className="apartment-secondary-button"
                onClick={
                  stopScanner
                }
              >
                Stop Camera
              </button>
            )}

            <div className="apartment-qr-divider">
              <span>OR</span>
            </div>

            <form
              className="apartment-manual-form"
              onSubmit={
                handleManualValidation
              }
            >
              <div className="apartment-qr-card-heading small">
                <div>
                  <p>
                    MANUAL ENTRY
                  </p>

                  <h2>
                    Enter Ticket
                    Code
                  </h2>
                </div>

                <Keyboard
                  size={22}
                />
              </div>

              <input
                type="text"
                value={
                  ticketCode
                }
                onChange={(
                  event
                ) =>
                  setTicketCode(
                    event.target
                      .value
                  )
                }
                placeholder="APT-TKT-..."
              />

              <button
                type="submit"
                className="apartment-primary-button"
                disabled={
                  validating
                }
              >
                <QrCode
                  size={18}
                />

                {validating
                  ? "Validating..."
                  : "Validate Ticket"}
              </button>
            </form>
          </section>

          <section className="apartment-qr-card apartment-result-card">
            <div className="apartment-qr-card-heading">
              <div>
                <p>
                  VALIDATION RESULT
                </p>

                <h2>
                  Booking Details
                </h2>
              </div>

              <ShieldCheck
                size={25}
              />
            </div>

            {!validatedData &&
              !message && (
                <div className="apartment-empty-result">
                  <div className="apartment-empty-icon">
                    <QrCode
                      size={37}
                    />
                  </div>

                  <h3>
                    Waiting for an
                    apartment
                    ticket
                  </h3>

                  <p>
                    Scan a QR code
                    or enter an
                    apartment
                    ticket code.
                    The apartment
                    and category
                    will appear
                    automatically.
                  </p>
                </div>
              )}

            {message && (
              <div
                className={`apartment-qr-message ${messageType}`}
              >
                {messageType ===
                "success" ? (
                  <CheckCircle2
                    size={20}
                  />
                ) : (
                  <CircleAlert
                    size={20}
                  />
                )}

                <span>
                  {message}
                </span>
              </div>
            )}

            {validatedData && (
              <div className="apartment-ticket-result">
                <div className="apartment-result-status">
                  <div
                    className={`apartment-result-status-icon ${
                      alreadyCheckedIn ||
                      alreadyCheckedOut
                        ? "used"
                        : "valid"
                    }`}
                  >
                    {alreadyCheckedIn ||
                    alreadyCheckedOut ? (
                      <CircleAlert
                        size={27}
                      />
                    ) : (
                      <CheckCircle2
                        size={27}
                      />
                    )}
                  </div>

                  <div>
                    <span>
                      {alreadyCheckedOut
                        ? "CHECKED OUT"
                        : alreadyCheckedIn
                        ? "ALREADY CHECKED IN"
                        : "VALID BOOKING"}
                    </span>

                    <h3>
                      {getGuestName(
                        validatedData
                      )}
                    </h3>
                  </div>
                </div>

                <div className="apartment-category-banner">
                  <Building2
                    size={21}
                  />

                  <div>
                    <span>
                      APARTMENT
                      CATEGORY
                    </span>

                    <strong>
                      {formatCategory(
                        validatedData
                          .apartment
                          ?.apartmentType
                      )}
                    </strong>
                  </div>
                </div>

                <div className="apartment-detail-list">
                  <div className="apartment-detail-item">
                    <Home
                      size={18}
                    />

                    <div>
                      <span>
                        Apartment
                      </span>

                      <strong>
                        {validatedData
                          .apartment
                          ?.title ||
                          "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-detail-item">
                    <MapPin
                      size={18}
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
                    <UserRound
                      size={18}
                    />

                    <div>
                      <span>
                        Guest
                      </span>

                      <strong>
                        {getGuestName(
                          validatedData
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-detail-item">
                    <QrCode
                      size={18}
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
                      size={18}
                    />

                    <div>
                      <span>
                        Booking
                        Reference
                      </span>

                      <strong>
                        {validatedData.bookingReference ||
                          "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-detail-item">
                    <BedDouble
                      size={18}
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
                      size={18}
                    />

                    <div>
                      <span>
                        Rooms
                      </span>

                      <strong>
                        {validatedData.numberOfUnits ??
                          "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-detail-item">
                    <CalendarDays
                      size={18}
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
                      size={18}
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
                        size={18}
                      />

                      <div>
                        <span>
                          Expected
                          Arrival
                        </span>

                        <strong>
                          {validatedData.expectedCheckInTime}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="apartment-detail-item">
                    <CreditCard
                      size={18}
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
                      size={18}
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

                {!alreadyCheckedIn &&
                  !alreadyCheckedOut &&
                  validatedData.bookingId && (
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
                        size={19}
                      />

                      {checkingIn
                        ? "Checking In..."
                        : "Check In Guest"}
                    </button>
                  )}

                {alreadyCheckedIn &&
                  validatedData.checkedInAt && (
                    <div className="apartment-checked-time">
                      <Clock
                        size={18}
                      />

                      <div>
                        <span>
                          Checked in
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
                      <Clock
                        size={18}
                      />

                      <div>
                        <span>
                          Checked out
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
                  className="apartment-scan-another"
                  onClick={
                    handleScanAnother
                  }
                >
                  <RotateCcw
                    size={18}
                  />
                  Scan Another
                  Ticket
                </button>
              </div>
            )}
          </section>
        </div>

        {scanHistory.length >
          0 && (
          <section className="apartment-qr-history">
            <div className="apartment-history-heading">
              <div>
                <p>
                  THIS SESSION
                </p>

                <h2>
                  Recent Apartment
                  Check-Ins
                </h2>
              </div>

              <span>
                {
                  scanHistory.length
                }
              </span>
            </div>

            <div className="apartment-history-list">
              {scanHistory.map(
                (
                  item,
                  index
                ) => (
                  <div
                    className="apartment-history-item"
                    key={`${item.ticketCode}-${index}`}
                  >
                    <CheckCircle2
                      size={20}
                    />

                    <div className="apartment-history-guest">
                      <strong>
                        {item.guest}
                      </strong>

                      <span>
                        {
                          item.apartment
                        }{" "}
                        •{" "}
                        {formatCategory(
                          item.category
                        )}
                      </span>
                    </div>

                    <div className="apartment-history-code">
                      <strong>
                        {
                          item.ticketCode
                        }
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