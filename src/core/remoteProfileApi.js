const SESSION_STORAGE_KEY = "any-ai-teacher.authSession.v1";

function getStorage() {
  const storage = globalThis?.localStorage;
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    return null;
  }
  return storage;
}

function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL || "/api";
  return String(raw).replace(/\/+$/, "");
}

function toErrorMessage(fallback, payload) {
  if (payload && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }
  return fallback;
}

class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, options = {}) {
  const { method = "GET", token = null, body } = options;
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (_) {
    throw new ApiError("Could not reach server.", 0, null);
  }

  let payload = null;
  const rawText = await response.text();
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch (_) {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(toErrorMessage(`Request failed (${response.status}).`, payload), response.status, payload);
  }

  if (payload && payload.ok === false) {
    throw new ApiError(toErrorMessage("Request failed.", payload), response.status, payload);
  }

  return payload;
}

export function readSession() {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (typeof parsed.token !== "string" || parsed.token.length < 20) {
      return null;
    }

    return {
      token: parsed.token,
      userName: typeof parsed.userName === "string" ? parsed.userName : "",
    };
  } catch (_) {
    return null;
  }
}

export function writeSession(session) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (_) {
    // Ignore storage failures.
  }
}

export function clearSession() {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(SESSION_STORAGE_KEY);
  } catch (_) {
    // Ignore storage failures.
  }
}

export function isAuthFailure(error) {
  return Boolean(error?.status === 401 || error?.status === 403);
}

export async function probeBackend() {
  try {
    const response = await request("/health.php");
    return Boolean(response?.ok === true);
  } catch (_) {
    return false;
  }
}

function normalizeAuthResponse(payload) {
  const token = payload?.data?.token;
  const userName = payload?.data?.user?.name;

  if (typeof token !== "string" || token.length < 20 || typeof userName !== "string") {
    throw new ApiError("Server returned an invalid auth payload.", 500, payload);
  }

  return {
    token,
    userName,
  };
}

export async function registerUser(credentials) {
  const payload = await request("/register.php", {
    method: "POST",
    body: credentials,
  });

  return normalizeAuthResponse(payload);
}

export async function loginUser(credentials) {
  const payload = await request("/login.php", {
    method: "POST",
    body: credentials,
  });

  return normalizeAuthResponse(payload);
}

export async function logoutUser(token) {
  if (!token) {
    return;
  }

  try {
    await request("/logout.php", {
      method: "POST",
      token,
    });
  } catch (_) {
    // Best effort.
  }
}

export async function fetchProfile(token) {
  const payload = await request("/profile.php", {
    token,
  });

  return {
    userName: typeof payload?.data?.user?.name === "string" ? payload.data.user.name : "",
    avatarUrl: typeof payload?.data?.user?.avatarUrl === "string" ? payload.data.user.avatarUrl : "",
    progressData: payload?.data?.progressData,
    lessonLoop: payload?.data?.lessonLoop,
    updatedAt: payload?.data?.updatedAt || null,
  };
}

export async function saveProfile(token, progressData, lessonLoop) {
  await request("/progress.php", {
    method: "PUT",
    token,
    body: {
      progressData,
      lessonLoop,
    },
  });
}

export async function updateAccountProfile(token, account) {
  const payload = await request("/account.php", {
    method: "PUT",
    token,
    body: {
      name: account?.name ?? "",
      avatarUrl: account?.avatarUrl ?? "",
    },
  });

  return {
    userName: typeof payload?.data?.user?.name === "string" ? payload.data.user.name : "",
    avatarUrl: typeof payload?.data?.user?.avatarUrl === "string" ? payload.data.user.avatarUrl : "",
  };
}

export async function changeAccountPassword(token, currentPassword, newPassword) {
  await request("/change-password.php", {
    method: "POST",
    token,
    body: {
      currentPassword,
      newPassword,
    },
  });
}

export { ApiError };
