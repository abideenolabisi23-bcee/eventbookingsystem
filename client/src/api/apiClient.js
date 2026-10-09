
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const createApiClient = (accountType) => {
  const api = axios.create({
    baseURL: API_URL,
    timeout: 30000
  });

  api.interceptors.request.use(
    (config) => {
      const tokenKey =
        accountType === "organizer"
          ? "organizerAccessToken"
          : accountType === "admin"
          ? "adminAccessToken"
          : "userAccessToken";

      const token = localStorage.getItem(tokenKey);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        delete config.headers.Authorization;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;

      if (status === 401) {
        const tokenKey =
          accountType === "organizer"
            ? "organizerAccessToken"
            : accountType === "admin"
            ? "adminAccessToken"
            : "userAccessToken";

        localStorage.removeItem(tokenKey);
      }

      return Promise.reject(error);
    }
  );

  return api;
};

export const userApi = createApiClient("user");

export const organizerApi = createApiClient("organizer");

export const adminApi = createApiClient("admin");

export default userApi;
