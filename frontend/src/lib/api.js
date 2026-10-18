import axios from "axios";

// Reads REACT_APP_BACKEND_URL if you set one in frontend/.env (must start
// with REACT_APP_ for CRA to expose it to the browser bundle).
// Falls back to localhost:8001 — make sure this matches whatever port your
// `uvicorn server:app --reload` is actually listening on.
const rawBackendUrl = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");
const BASE_URL = rawBackendUrl.endsWith("/api") ? rawBackendUrl : `${rawBackendUrl}/api`;

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s timeout to accommodate Render free tier cold starts & AI generation
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
  if (error?.code === "ECONNABORTED" || error?.message?.toLowerCase().includes("timeout")) {
    return "Server request timed out. The cloud backend is likely waking up from idle (Render free tier cold start). Please click again in a few seconds!";
  }

  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (typeof error?.response?.data === "string") {
    return error.response.data;
  }

  if (error?.message === "Network Error" || !error?.response) {
    return "Cannot reach StudyMind cloud server. It is likely spinning up from idle — please wait 20-30 seconds and retry.";
  }

  if (error?.message) {
    return error.message;
  }

  return "Something went wrong. Please check your connection and try again.";
}

/**
 * Pre-warms the Render backend by sending a lightweight health check ping.
 * Prevents cold-start delays when the user actually submits a form or requests AI content.
 */
export async function pingBackend() {
  try {
    const backendRoot = BASE_URL.replace(/\/api$/, "");
    await axios.get(`${backendRoot}/health`, { timeout: 15000 });
    return true;
  } catch (err) {
    return false;
  }
}

