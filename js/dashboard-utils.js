/**
 * PKL.CLUB Dashboard Utilities
 * Shared JavaScript functions for operator and admin dashboards
 */

const PKL_API_URL = "http://localhost:3333";

/**
 * Toast Notification System
 */
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) {
    console.warn("Toast container not found");
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "fa-check-circle",
    error: "fa-times-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };

  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

/**
 * Authentication Utilities
 */
function getAuthToken() {
  return localStorage.getItem("pkl_token");
}

function setAuthToken(token) {
  localStorage.setItem("pkl_token", token);
}

function clearAuth() {
  localStorage.removeItem("pkl_token");
}

function logout() {
  clearAuth();
  window.location.href = "login.html";
}

/**
 * API Request Helper with Authentication
 */
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${PKL_API_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Request failed with status ${response.status}`,
    );
  }

  return response.json();
}

/**
 * Date Formatting
 */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Status Badge HTML Generator
 */
function getStatusBadge(status) {
  return `<span class="status-badge ${status}">${status}</span>`;
}

/**
 * Location Formatter
 */
function formatLocation(location) {
  if (!location) return "N/A";
  const parts = [location.city, location.state, location.country].filter(
    Boolean,
  );
  return parts.join(", ") || "N/A";
}

/**
 * Modal Utilities
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("show");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("show");
  }
}

/**
 * Secure Admin Check - Double verification
 */
async function verifyAdminAccess() {
  const token = getAuthToken();

  if (!token) {
    return { authorized: false, reason: "No authentication token" };
  }

  try {
    const response = await fetch(`${PKL_API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return { authorized: false, reason: "Invalid token" };
    }

    const user = await response.json();

    if (user.userType !== "admin") {
      return { authorized: false, reason: "Not an admin", user };
    }

    return { authorized: true, user };
  } catch (error) {
    return { authorized: false, reason: error.message };
  }
}

/**
 * Secure Operator Check
 */
async function verifyOperatorAccess() {
  const token = getAuthToken();

  if (!token) {
    return { authorized: false, reason: "No authentication token" };
  }

  try {
    const response = await fetch(`${PKL_API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return { authorized: false, reason: "Invalid token" };
    }

    const user = await response.json();

    if (user.userType !== "operator" && user.userType !== "admin") {
      return { authorized: false, reason: "Not an operator", user };
    }

    return { authorized: true, user };
  } catch (error) {
    return { authorized: false, reason: error.message };
  }
}

/**
 * Table Empty State
 */
function showEmptyState(containerId, icon, title, subtitle) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <tr>
        <td colspan="100%">
          <div class="no-events">
            <i class="fas ${icon}"></i>
            <h4>${title}</h4>
            <p>${subtitle}</p>
          </div>
        </td>
      </tr>
    `;
  }
}

/**
 * Loading State
 */
function showLoadingState(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <tr>
        <td colspan="100%">
          <div class="no-events">
            <i class="fas fa-spinner fa-spin"></i>
            <h4>Loading...</h4>
          </div>
        </td>
      </tr>
    `;
  }
}
