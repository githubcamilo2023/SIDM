const API_URL = import.meta.env.VITE_API_URL || "https://sidm-production.up.railway.app/api/v1";

const AuthService = {
  getAccessToken: () => sessionStorage.getItem("sidm_access"),
  getRefreshToken: () => sessionStorage.getItem("sidm_refresh"),

  setTokens: (access, refresh) => {
    sessionStorage.setItem("sidm_access", access);
    if (refresh) sessionStorage.setItem("sidm_refresh", refresh);
  },

  clearTokens: () => {
    sessionStorage.removeItem("sidm_access");
    sessionStorage.removeItem("sidm_refresh");
  },

  refreshAccessToken: async () => {
    const refresh = AuthService.getRefreshToken();
    if (!refresh) return null;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      sessionStorage.setItem("sidm_access", data.access_token);
      return data.access_token;
    } catch { return null; }
  },

  secureFetch: async (url, options = {}) => {
    let token = AuthService.getAccessToken();
    if (!token) throw new Error("NO_TOKEN");
    const doFetch = (t) => fetch(url, {
      ...options,
      headers: { ...options.headers, "Authorization": `Bearer ${t}` },
    });
    let res = await doFetch(token);
    if (res.status === 401) {
      const newToken = await AuthService.refreshAccessToken();
      if (!newToken) throw new Error("SESSION_EXPIRED");
      res = await doFetch(newToken);
      if (res.status === 401) throw new Error("SESSION_EXPIRED");
    }
    return res;
  },
};

export { API_URL };
export default AuthService;
