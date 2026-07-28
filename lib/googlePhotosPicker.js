const GIS_SRC = "https://accounts.google.com/gsi/client";
const PICKER_SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const API_BASE = "https://photospicker.googleapis.com/v1";

// Google PhotosのbaseUrlに指定サイズのサムネイルを要求するためのサフィックスを付与する。
// (baseUrl自体はGoogle側の仕様で発行から一定時間で期限切れになる)
export function buildSizedPhotoUrl(baseUrl, size = 640) {
  return `${baseUrl}=w${size}-h${size}`;
}

function loadGis() {
  if (window.google && window.google.accounts && window.google.accounts.oauth2) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Identity Servicesの読み込みに失敗しました")));
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Identity Servicesの読み込みに失敗しました"));
    document.head.appendChild(script);
  });
}

function requestAccessToken(clientId) {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: PICKER_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.access_token);
        }
      },
    });
    client.requestAccessToken();
  });
}

async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`Photos Picker API error: ${res.status}`);
  return res.json();
}

function createSession(token) {
  return apiFetch("/sessions", token, { method: "POST" });
}

function getSession(sessionId, token) {
  return apiFetch(`/sessions/${sessionId}`, token);
}

function listMediaItems(sessionId, token) {
  return apiFetch(`/mediaItems?sessionId=${sessionId}`, token);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSelection(sessionId, token, { pollIntervalMs = 2000, timeoutMs = 5 * 60 * 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const session = await getSession(sessionId, token);
    if (session.mediaItemsSet) return session;
    await sleep(pollIntervalMs);
  }
  // throw new Error("Google Photosの選択がタイムアウトしました");
  return null; // タイムアウト時はエラーにせずnullを返す
}

// Google Photos Picker を開いてユーザーに写真を1枚選んでもらい、
// 選択されたメディアの{baseUrl, mimeType, token}を返す。キャンセル時はnull。
export async function pickGooglePhoto(clientId) {
  await loadGis();
  const token = await requestAccessToken(clientId);
  const session = await createSession(token);
  const pickerWindow = window.open(session.pickerUri, "_blank", "noopener");
  try {
    await waitForSelection(session.id, token);
  } finally {
    if (pickerWindow && !pickerWindow.closed) pickerWindow.close();
  }
  const { mediaItems } = await listMediaItems(session.id, token);
  if (!mediaItems || !mediaItems.length) return null;
  const item = mediaItems[0];
  return {
    baseUrl: item.mediaFile.baseUrl,
    mimeType: item.mediaFile.mimeType,
    createTime: item.createTime || null,
    token,
  };
}

// baseUrlから指定サイズの画像を取得し、data URLとして解決する。
export async function fetchGooglePhotoDataUrl(baseUrl, token, size = 640) {
  const res = await fetch(buildSizedPhotoUrl(baseUrl, size), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`画像の取得に失敗しました (${res.status})`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("画像の読み込みに失敗しました"));
    reader.readAsDataURL(blob);
  });
}
