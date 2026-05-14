const API_BASE = "/api";
const AUTH_KEY = "pillar_auth";

export interface ApiUser {
  username: string;
  full_name: string | null;
  email: string | null;
}

export interface AuthSession {
  accessToken: string;
  user: ApiUser | null;
}

export interface Patient {
  id: string;
  name: string;
  age: number | null;
  condition: string | null;
  dispensers: string[];
  caregiver_username: string;
}

export interface PatientInput {
  name: string;
  age?: number | null;
  condition?: string | null;
}

export interface Dispenser {
  id: string;
  hardware_id: string;
  patient_id: string | null;
  patient_name: string | null;
  is_online: boolean;
  battery_level: number;
  critical_stock: boolean;
  last_sync: string | null;
}

export interface PairDispenserInput {
  patientId: string;
}

export interface DiscoveredDispenser {
  id: string;
  serial: string;
  mac: string;
  rssi: number;
  firmware: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

function readAuthSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function writeAuthSession(session: AuthSession | null) {
  if (session) {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(AUTH_KEY);
  }
}

export function getStoredAuthSession(): AuthSession | null {
  return readAuthSession();
}

export function getAccessToken(): string | null {
  return readAuthSession()?.accessToken ?? null;
}

export function setAuthSession(session: AuthSession | null) {
  writeAuthSession(session);
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string") return payload.detail;
    if (Array.isArray(payload.detail)) {
      const messages = payload.detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg?: unknown }).msg ?? "");
          }
          return "";
        })
        .filter(Boolean);
      if (messages.length > 0) return messages.join("; ");
    }
  } catch {
    // ignore JSON parse errors and fall back to text
  }

  const text = await response.text().catch(() => "");
  return text || `HTTP ${response.status}`;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function loginWithPassword(username: string, password: string) {
  const token = await requestJson<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return token.access_token;
}

export async function registerUser(data: { username: string; password: string; tax_id: string; full_name?: string; email?: string }) {
  return requestJson<any>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getProfile() {
  return requestJson<ApiUser>("/auth/profile");
}

export async function listPatients() {
  return requestJson<Patient[]>("/patients");
}

export async function getPatient(patientId: string) {
  return requestJson<Patient>(`/patients/${patientId}`);
}

export async function createPatient(input: PatientInput) {
  return requestJson<Patient>("/patients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePatient(patientId: string, input: PatientInput) {
  return requestJson<Patient>(`/patients/${patientId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deletePatient(patientId: string) {
  await requestJson<void>(`/patients/${patientId}`, {
    method: "DELETE",
  });
}

export async function listDispensers() {
  return requestJson<Dispenser[]>("/dispensers");
}

export async function pairDispenser(hardwareId: string, patientId: string) {
  return requestJson<Dispenser>(`/dispensers/${hardwareId}/pair`, {
    method: "POST",
    body: JSON.stringify({ patient_id: patientId }),
  });
}

export async function deleteDispenser(hardwareId: string) {
  await requestJson<void>(`/dispensers/${hardwareId}`, {
    method: "DELETE",
  });
}

export function mapPatientStatus(patient: Patient) {
  return patient.dispensers.length > 0 ? "ativo" : "inativo";
}
