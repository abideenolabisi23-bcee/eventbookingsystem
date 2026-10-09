const getPaymentCallbackUrl = (req, path) => {
  const allowedFrontends = [
    "http://localhost:5173",
    "https://eventbookingsystem-gkh7.vercel.app"
  ];

  const origin = req.get("Origin");

  const frontendUrl = allowedFrontends.includes(origin)
    ? origin
    : process.env.FRONTEND_URL;

  if (!frontendUrl || !allowedFrontends.includes(frontendUrl)) {
    throw new Error("Payment frontend URL is not configured");
  }

  return `${frontendUrl}${path}`;
};

module.exports = getPaymentCallbackUrl;