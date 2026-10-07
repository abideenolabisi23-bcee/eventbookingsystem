import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  DoorOpen,
  Hash,
  Home,
  KeyRound,
  LoaderCircle,
  MapPin,
  QrCode,
  ScanLine,
  Search,
  UserRound,
  XCircle
} from "lucide-react";
import "../styles/apartmentQRCheckIn.css";

const API_URL =
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const ApartmentQRCheckIn = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticketCode, setTicketCode] = useState("");
  const [validatedData, setValidatedData] = useState(null);

  const [validating, setValidating] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);

  const [availableCameras, setAvailableCameras] =
    useState([]);

  const [selectedCameraId, setSelectedCameraId] =
    useState("");

  const scannerRef = useRef(null);
  const scannerRunningRef = useRef(false);
  const scanProcessingRef = useRef(false);

  const accessToken =
    localStorage.getItem("accessToken");

  const getHeaders = () => {
    return {
      Authorization: `Bearer ${accessToken}`
    };
  };

  const showMessage = (type, text) => {
    setMessageType(type);
    setMessage(text);
  };

  const clearResult = () => {
    setValidatedData(null);
    setMessage("");
    setMessageType("");
  };

  const formatPrice = (amount) => {
    return Number(amount || 0).toLocaleString(
      "en-NG"
    );
  };

  const formatDate = (date) => {
    if (!date) {
      return "Not available";
    }

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );
  };

  const formatDateTime = (date) => {
    if (!date) {
      return "Not available";
    }

    return new Date(date).toLocaleString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }
    );
  };

  const stopScanner = async () => {
    if (!scannerRef.current) {
      scannerRunningRef.current = false;
      return;
    }

    try {
      if (scannerRunningRef.current) {
        await scannerRef.current.stop();
      }
    } catch (error) {
      console.log(
        "STOP APARTMENT SCANNER ERROR:",
        error
      );
    }

    try {
      await scannerRef.current.clear();
    } catch (error) {
      console.log(
        "CLEAR APARTMENT SCANNER ERROR:",
        error
      );
    }

    scannerRef.current = null;
    scannerRunningRef.current = false;
  };

  const validateCode = async (
    value,
    scanned = false
  ) => {
    const cleanValue =
      typeof value === "string"
        ? value.trim()
        : "";

    if (!cleanValue) {
      showMessage(
        "error",
        "Enter an apartment ticket code first."
      );
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
          headers: getHeaders()
        }
      );

      if (!response.data.valid) {
        setValidatedData(
          response.data.data || null
        );

        showMessage(
          "error",
          response.data.message ||
            "Apartment ticket is not valid."
        );

        return;
      }

      const data = response.data.data;

      if (
        id &&
        data.apartment?._id &&
        data.apartment._id.toString() !==
          id.toString()
      ) {
        setValidatedData(null);

        showMessage(
          "error",
          "This ticket belongs to another apartment."
        );

        return;
      }

      setValidatedData(data);

      setTicketCode(
        data.ticketCode || cleanValue
      );

      showMessage(
        "success",
        response.data.message ||
          "Apartment ticket is valid."
      );
    } catch (error) {
      console.log(
        "VALIDATE APARTMENT TICKET ERROR:",
        error
      );

      setValidatedData(null);

      showMessage(
        "error",
        error.response?.data?.message ||
          "Cannot validate apartment ticket at this time."
      );
    } finally {
      setValidating(false);
      scanProcessingRef.current = false;
    }
  };

  const handleManualValidation = async (
    event
  ) => {
    event.preventDefault();

    await validateCode(ticketCode, false);
  };

  const handleSuccessfulScan = async (
    decodedText
  ) => {
    if (scanProcessingRef.current) {
      return;
    }

    scanProcessingRef.current = true;

    await stopScanner();

    setScannerOpen(false);

    setTicketCode(decodedText);

    await validateCode(decodedText, true);
  };

  const runScanner = async (cameraId) => {
    try {
      await stopScanner();

      const scanner =
        new Html5Qrcode(
          "vibely-apartment-qr-reader"
        );

      scannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const smallestSide = Math.min(
              viewfinderWidth,
              viewfinderHeight
            );

            const size = Math.floor(
              smallestSide * 0.7
            );

            return {
              width: size,
              height: size
            };
          }
        },
        async (decodedText) => {
          await handleSuccessfulScan(
            decodedText
          );
        },
        () => {}
      );

      scannerRunningRef.current = true;
    } catch (error) {
      console.log(
        "APARTMENT CAMERA START ERROR:",
        error
      );

      scannerRunningRef.current = false;

      showMessage(
        "error",
        "Camera could not start. Try another camera or enter the ticket code manually."
      );
    }
  };

  const startScanner = async () => {
    try {
      clearResult();

      setScannerOpen(true);
      setScannerStarting(true);

      scanProcessingRef.current = false;

      const cameras =
        await Html5Qrcode.getCameras();

      if (
        !cameras ||
        cameras.length === 0
      ) {
        showMessage(
          "error",
          "No camera was found on this device."
        );

        setScannerOpen(false);
        return;
      }

      setAvailableCameras(cameras);

      const preferredCamera =
        cameras.find((camera) => {
          const label =
            camera.label?.toLowerCase() || "";

          return (
            label.includes("back") ||
            label.includes("rear") ||
            label.includes("environment")
          );
        }) ||
        cameras.find((camera) => {
          const label =
            camera.label?.toLowerCase() || "";

          return (
            label.includes("integrated") ||
            label.includes("webcam") ||
            label.includes("front") ||
            label.includes("hp")
          );
        }) ||
        cameras[0];

      setSelectedCameraId(
        preferredCamera.id
      );

      setTimeout(async () => {
        await runScanner(
          preferredCamera.id
        );
      }, 100);
    } catch (error) {
      console.log(
        "GET APARTMENT CAMERAS ERROR:",
        error
      );

      showMessage(
        "error",
        "Camera permission was denied or the camera could not be accessed."
      );

      setScannerOpen(false);
    } finally {
      setScannerStarting(false);
    }
  };

  const closeScanner = async () => {
    await stopScanner();

    setScannerOpen(false);
    setScannerStarting(false);
    scanProcessingRef.current = false;
  };

  const handleCameraChange = async (
    event
  ) => {
    const cameraId =
      event.target.value;

    setSelectedCameraId(cameraId);

    setScannerStarting(true);

    await runScanner(cameraId);

    setScannerStarting(false);
  };

  const handleCheckInGuest = async () => {
    if (!validatedData?.bookingId) {
      showMessage(
        "error",
        "Validate the apartment ticket before checking in the guest."
      );

      return;
    }

    try {
      setCheckingIn(true);

      const response = await axios.patch(
        `${API_URL}/organizer/apartment-bookings/${validatedData.bookingId}/check-in`,
        {},
        {
          headers: getHeaders()
        }
      );

      setValidatedData((current) => ({
        ...current,
        stayStatus: "checked_in",
        checkedInAt:
          response.data.data?.checkedInAt ||
          new Date().toISOString()
      }));

      showMessage(
        "success",
        response.data.message ||
          "Guest checked in successfully."
      );
    } catch (error) {
      console.log(
        "APARTMENT CHECK-IN ERROR:",
        error
      );

      showMessage(
        "error",
        error.response?.data?.message ||
          "Cannot check in guest at this time."
      );
    } finally {
      setCheckingIn(false);
    }
  };

  const resetValidation = async () => {
    await closeScanner();

    setTicketCode("");
    setValidatedData(null);
    setMessage("");
    setMessageType("");
  };

  useEffect(() => {
    return () => {
      if (
        scannerRef.current &&
        scannerRunningRef.current
      ) {
        scannerRef.current
          .stop()
          .catch(() => {});
      }
    };
  }, []);

  if (!accessToken) {
    return (
      <div className="apartment-qr-auth-page">
        <div className="apartment-qr-auth-card">
          <KeyRound size={38} />

          <h2>Organizer login required</h2>

          <p>
            Please sign in again before
            validating apartment tickets.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/organizer/login")
            }
          >
            Go to Organizer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="apartment-qr-page">
      <div className="apartment-qr-container">
        <header className="apartment-qr-header">
          <button
            type="button"
            className="apartment-qr-back"
            onClick={() =>
              navigate(
                `/organizer/apartments/${id}`
              )
            }
          >
            <ArrowLeft size={18} />
            Apartment
          </button>

          <div className="apartment-qr-heading">
            <div className="apartment-qr-heading-icon">
              <QrCode size={27} />
            </div>

            <div>
              <span>
                Guest Verification
              </span>

              <h1>
                Apartment Check-In
              </h1>

              <p>
                Scan the guest's QR code or
                enter their apartment ticket
                code manually.
              </p>
            </div>
          </div>
        </header>

        {message && (
          <div
            className={`apartment-qr-message ${messageType}`}
          >
            {messageType ===
            "success" ? (
              <CheckCircle2 size={21} />
            ) : (
              <CircleAlert size={21} />
            )}

            <span>{message}</span>
          </div>
        )}

        <div className="apartment-qr-layout">
          <section className="apartment-qr-control-card">
            <div className="apartment-qr-card-heading">
              <span>
                <ScanLine size={17} />
                Verification
              </span>

              <h2>
                Scan or enter ticket
              </h2>
            </div>

            <button
              type="button"
              className="apartment-open-camera"
              onClick={
                scannerOpen
                  ? closeScanner
                  : startScanner
              }
              disabled={
                scannerStarting ||
                validating
              }
            >
              {scannerOpen ? (
                <>
                  <CameraOff size={19} />
                  Close Camera
                </>
              ) : (
                <>
                  <Camera size={19} />
                  Scan QR Code
                </>
              )}
            </button>

            {scannerOpen && (
              <div className="apartment-camera-section">
                {availableCameras.length >
                  1 && (
                  <div className="apartment-camera-selector">
                    <label>
                      Select Camera
                    </label>

                    <select
                      value={
                        selectedCameraId
                      }
                      onChange={
                        handleCameraChange
                      }
                      disabled={
                        scannerStarting
                      }
                    >
                      {availableCameras.map(
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
                )}

                <div className="apartment-camera-frame">
                  <div
                    id="vibely-apartment-qr-reader"
                    className="apartment-qr-reader"
                  ></div>

                  {scannerStarting && (
                    <div className="apartment-camera-loading">
                      <LoaderCircle
                        size={30}
                        className="apartment-spin"
                      />

                      <span>
                        Starting camera...
                      </span>
                    </div>
                  )}
                </div>

                <p className="apartment-camera-help">
                  Hold the apartment QR
                  code inside the scanning
                  box.
                </p>
              </div>
            )}

            <div className="apartment-qr-divider">
              <span>OR</span>
            </div>

            <form
              onSubmit={
                handleManualValidation
              }
              className="apartment-manual-form"
            >
              <label
                htmlFor="apartment-ticket-code"
              >
                Apartment Ticket Code
              </label>

              <div className="apartment-ticket-input">
                <Hash size={18} />

                <input
                  id="apartment-ticket-code"
                  type="text"
                  value={ticketCode}
                  onChange={(event) => {
                    setTicketCode(
                      event.target.value
                    );

                    if (
                      validatedData
                    ) {
                      setValidatedData(
                        null
                      );
                    }
                  }}
                  placeholder="APT-TKT-..."
                  autoComplete="off"
                />
              </div>

              <button
                type="submit"
                className="apartment-validate-button"
                disabled={
                  validating ||
                  !ticketCode.trim()
                }
              >
                {validating ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className="apartment-spin"
                    />
                    Validating...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Validate Ticket
                  </>
                )}
              </button>
            </form>
          </section>

          <section className="apartment-qr-result-card">
            {!validatedData ? (
              <div className="apartment-empty-result">
                <div className="apartment-empty-result-icon">
                  <QrCode size={39} />
                </div>

                <h3>
                  Waiting for a ticket
                </h3>

                <p>
                  Scan a customer's
                  apartment QR code or
                  enter their ticket code
                  to see their booking
                  details.
                </p>
              </div>
            ) : (
              <>
                <div className="apartment-result-header">
                  <div>
                    <span>
                      Verification Result
                    </span>

                    <h2>
                      Guest Booking
                    </h2>
                  </div>

                  <div
                    className={`apartment-result-status ${
                      validatedData.stayStatus ===
                      "checked_in"
                        ? "checked-in"
                        : "valid"
                    }`}
                  >
                    {validatedData.stayStatus ===
                    "checked_in" ? (
                      <>
                        <CheckCircle2
                          size={16}
                        />
                        Checked In
                      </>
                    ) : (
                      <>
                        <CheckCircle2
                          size={16}
                        />
                        Valid
                      </>
                    )}
                  </div>
                </div>

                <div className="apartment-guest-card">
                  <div className="apartment-guest-avatar">
                    <UserRound size={24} />
                  </div>

                  <div>
                    <span>Guest</span>

                    <strong>
                      {validatedData.guest
                        ?.firstname ||
                        "Guest"}{" "}
                      {validatedData.guest
                        ?.lastname || ""}
                    </strong>

                    <small>
                      {validatedData.guest
                        ?.email ||
                        "No email available"}
                    </small>
                  </div>
                </div>

                <div className="apartment-result-grid">
                  <div className="apartment-result-item">
                    <Home size={18} />

                    <div>
                      <span>
                        Apartment
                      </span>

                      <strong>
                        {validatedData
                          .apartment
                          ?.title ||
                          "Apartment"}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-result-item">
                    <MapPin size={18} />

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

                  <div className="apartment-result-item">
                    <Hash size={18} />

                    <div>
                      <span>
                        Booking Reference
                      </span>

                      <strong>
                        {validatedData.bookingReference}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-result-item">
                    <QrCode size={18} />

                    <div>
                      <span>
                        Ticket Code
                      </span>

                      <strong>
                        {validatedData.ticketCode}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-result-item">
                    <DoorOpen size={18} />

                    <div>
                      <span>
                        Stay Type
                      </span>

                      <strong>
                        {validatedData.stayType ===
                        "day_use"
                          ? "Day Use"
                          : "Overnight"}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-result-item">
                    <Home size={18} />

                    <div>
                      <span>
                        Rooms
                      </span>

                      <strong>
                        {validatedData.numberOfUnits ||
                          1}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-result-item">
                    <Clock3 size={18} />

                    <div>
                      <span>
                        Check-In Date
                      </span>

                      <strong>
                        {formatDate(
                          validatedData.checkInDate
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-result-item">
                    <Clock3 size={18} />

                    <div>
                      <span>
                        Check-Out Date
                      </span>

                      <strong>
                        {formatDate(
                          validatedData.checkOutDate
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-result-item">
                    <CreditCard size={18} />

                    <div>
                      <span>
                        Amount Paid
                      </span>

                      <strong>
                        ₦
                        {formatPrice(
                          validatedData.totalAmount
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="apartment-result-item">
                    <CheckCircle2
                      size={18}
                    />

                    <div>
                      <span>
                        Payment
                      </span>

                      <strong>
                        {validatedData.paymentStatus}
                      </strong>
                    </div>
                  </div>
                </div>

                {validatedData.expectedCheckInTime && (
                  <div className="apartment-schedule-note">
                    <Clock3 size={18} />

                    <div>
                      <span>
                        Expected Arrival
                      </span>

                      <strong>
                        {
                          validatedData.expectedCheckInTime
                        }
                      </strong>
                    </div>
                  </div>
                )}

                {validatedData.stayStatus ===
                "checked_in" ? (
                  <div className="apartment-already-checked">
                    <CheckCircle2
                      size={23}
                    />

                    <div>
                      <strong>
                        Guest is checked in
                      </strong>

                      <span>
                        {validatedData.checkedInAt
                          ? `Checked in ${formatDateTime(
                              validatedData.checkedInAt
                            )}`
                          : "Check-in completed successfully."}
                      </span>
                    </div>
                  </div>
                ) : validatedData.stayStatus ===
                  "checked_out" ? (
                  <div className="apartment-invalid-state">
                    <XCircle size={23} />

                    <div>
                      <strong>
                        Guest has checked out
                      </strong>

                      <span>
                        This stay has already
                        been completed.
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="apartment-checkin-button"
                    onClick={
                      handleCheckInGuest
                    }
                    disabled={
                      checkingIn
                    }
                  >
                    {checkingIn ? (
                      <>
                        <LoaderCircle
                          size={19}
                          className="apartment-spin"
                        />
                        Checking In...
                      </>
                    ) : (
                      <>
                        <CheckCircle2
                          size={19}
                        />
                        Check In Guest
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  className="apartment-scan-another"
                  onClick={
                    resetValidation
                  }
                >
                  <ScanLine size={17} />
                  Verify Another Guest
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ApartmentQRCheckIn;