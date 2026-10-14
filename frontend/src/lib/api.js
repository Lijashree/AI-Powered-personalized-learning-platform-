import axios from "axios";

// Reads REACT_APP_BACKEND_URL if you set one in frontend/.env (must start
// with REACT_APP_ for CRA to expose it to the browser bundle).
// Falls back to localhost:8001 — make sure this matches whatever port your
// `uvicorn server:app --reload` is actually listening on.
const BASE_URL = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : "http://localhost:8000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("studymind_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export function formatApiError(error) {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (typeof error.response?.data === "string") {
    return error.response.data;
  }

  if (error.message) {
    return error.message;
  }

  return "Something went wrong.";
}
