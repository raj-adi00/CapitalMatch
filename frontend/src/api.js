import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const orgSlug = Cookies.get("selected_org");
  if (orgSlug) {
    config.headers["X-Organization"] = orgSlug;
  }
  return config;
});

export default api;
