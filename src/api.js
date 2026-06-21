const configuredUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
export const apiBase = configuredUrl.endsWith("/api") ? configuredUrl : `${configuredUrl}/api`;

export async function api(path, options = {}) {
  try {
    const token = localStorage.getItem("crowdfaq_token");
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        ...(options.body && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
    const result = await response.json().catch(() => ({ success: false, message: "The server returned an invalid response" }));
    if (!response.ok) {
      const error = new Error(result.message || "Something went wrong. Please try again.");
      error.status = response.status;
      error.errors = result.errors ?? {};
      throw error;
    }
    return result.data;
  } catch (error) {
    if (!error.errors) error.errors = {};
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      error.message = "Cannot connect to the server. The backend may still be starting up — please wait a moment and try again.";
    }
    throw error;
  }
}

export function post(path, body) {
  return api(path, { method: "POST", body: JSON.stringify(body) });
}

export function patch(path, body = {}) {
  return api(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function remove(path) {
  return api(path, { method: "DELETE" });
}
