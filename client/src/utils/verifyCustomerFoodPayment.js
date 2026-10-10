import axios from "axios";

const API = (
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1"
).replace(/\/+$/, "");

const verifyCustomerFoodPayment = async (reference) => {
  const verifyUrl = `${API}/food-payments/verify/${encodeURIComponent(reference)}`;

  const sendVerification = (token) =>
    axios.get(verifyUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

  const accessToken = localStorage.getItem("userAccessToken");

  if (!accessToken) {
    const error = new Error("Customer login required");
    error.response = { status: 401 };
    throw error;
  }

  try {
    return await sendVerification(accessToken);
  } catch (error) {
    if (error.response?.status !== 401) {
      throw error;
    }

    const refreshToken = localStorage.getItem("userRefreshToken");

    if (!refreshToken) {
      throw error;
    }

    const refreshResponse = await axios.post(
      `${API}/refresh-token`,
      { refreshToken }
    );

    const refreshedData = refreshResponse.data?.data || {};

    const newAccessToken = refreshedData.accessToken;

    if (!newAccessToken) {
      throw new Error("Unable to refresh customer session");
    }

    localStorage.setItem("userAccessToken", newAccessToken);

    if (refreshedData.refreshToken) {
      localStorage.setItem(
        "userRefreshToken",
        refreshedData.refreshToken
      );
    }

    return await sendVerification(newAccessToken);
  }
};

export default verifyCustomerFoodPayment;