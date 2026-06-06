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
  critical_stock: boolean;
  last_sync: string | null;
}

export interface DispenserStatusPublic {
  dispenser_id: string;
  online: boolean;
  critical_stock: boolean;
  ip_address?: string | null;
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

export class ApiError extends Error {
  status: number;
  code?: string;
  steps: string[];
  blockers?: Record<string, number>;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.steps = [];
    if (detail && typeof detail === "object") {
      const d = detail as Record<string, unknown>;
      if (typeof d.code === "string") this.code = d.code;
      if (Array.isArray(d.steps)) this.steps = d.steps.map(String);
      if (d.blockers && typeof d.blockers === "object") {
        this.blockers = d.blockers as Record<string, number>;
      }
      if (typeof d.message === "string" && d.message) {
        this.message = d.message;
      }
    }
  }
}

async function readApiError(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string") {
      return new ApiError(response.status, payload.detail);
    }
    if (payload.detail && typeof payload.detail === "object") {
      const detail = payload.detail as Record<string, unknown>;
      const message =
        typeof detail.message === "string"
          ? detail.message
          : "Erro na requisição";
      return new ApiError(response.status, message, detail);
    }
    if (Array.isArray(payload.detail)) {
      const messages = payload.detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg?: unknown }).msg ?? "");
          }
          return "";
        })
        .filter(Boolean);
      if (messages.length > 0) {
        return new ApiError(response.status, messages.join("; "));
      }
    }
  } catch {
    // ignore JSON parse errors and fall back to text
  }

  const text = await response.text().catch(() => "");
  return new ApiError(response.status, text || `HTTP ${response.status}`);
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
    throw await readApiError(response);
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

export async function discoverDispensers() {
  return requestJson<DiscoveredDispenser[]>("/dispensers/discover");
}

function dispenserPath(hardwareId: string) {
  return `/dispensers/${encodeURIComponent(hardwareId)}`;
}

export async function pairDispenser(hardwareId: string, patientId: string) {
  return requestJson<Dispenser>(`${dispenserPath(hardwareId)}/pair`, {
    method: "POST",
    body: JSON.stringify({ patient_id: patientId }),
  });
}

export interface DispenserDeletionBlockers {
  medications_in_slots: number;
  schedules: number;
}

export interface DispenserDeletionStatus {
  can_delete: boolean;
  blockers: DispenserDeletionBlockers;
  message: string;
  steps: string[];
}

export interface DispenserResetConfigurationResult {
  removed_medications: number;
  removed_schedules: number;
  message: string;
}

export async function getDispenserDeletionStatus(hardwareId: string) {
  return requestJson<DispenserDeletionStatus>(
    `${dispenserPath(hardwareId)}/deletion-status`,
  );
}

export async function resetDispenserConfiguration(hardwareId: string) {
  return requestJson<DispenserResetConfigurationResult>(
    `${dispenserPath(hardwareId)}/reset-configuration`,
    { method: "POST" },
  );
}

export interface DispenserForgetWifiResult {
  success: boolean;
  message: string;
  hardware_id: string;
}

export async function forgetDispenserWifi(hardwareId: string) {
  return requestJson<DispenserForgetWifiResult>(
    `${dispenserPath(hardwareId)}/forget-wifi`,
    { method: "POST" },
  );
}

export async function deleteDispenser(hardwareId: string) {
  await requestJson<void>(dispenserPath(hardwareId), {
    method: "DELETE",
  });
}

export interface PeriodSchedule {
  dispenser_id: string;
  patient_id: string;
  morning_time: string;
  afternoon_time: string;
  night_time: string;
  is_active: boolean;
  source: string;
}

export interface PeriodScheduleInput {
  patient_id: string;
  morning_time: string;
  afternoon_time: string;
  night_time: string;
  is_active?: boolean;
}

export interface HardwareStatus {
  current_slot: number;
  total_slots: number;
  awaiting_confirm: boolean;
  last_confirmed_slot: number;
  wifi_rssi?: number;
  hardware_id?: string;
  uptime_s?: number;
}

export interface StartCycleResult {
  success: boolean;
  message: string;
  current_slot: number;
  hardware_id: string;
}

export async function getPeriodSchedule(hardwareId: string) {
  return requestJson<PeriodSchedule>(`${dispenserPath(hardwareId)}/period-schedule`);
}

export async function savePeriodSchedule(hardwareId: string, input: PeriodScheduleInput) {
  return requestJson<PeriodSchedule>(`${dispenserPath(hardwareId)}/period-schedule`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function getHardwareStatus(hardwareId: string) {
  return requestJson<HardwareStatus>(`${dispenserPath(hardwareId)}/hardware-status`);
}

export async function startDispenserCycle(hardwareId: string) {
  return requestJson<StartCycleResult>(`${dispenserPath(hardwareId)}/start-cycle`, {
    method: "POST",
  });
}

export function mapPatientStatus(patient: Patient) {
  return patient.dispensers.length > 0 ? "ativo" : "inativo";
}

// -- New Endpoints for Dashboard Redesign --

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  description?: string | null;
  patient_id?: string;
}

export interface SlotMedicationItem {
  medication: Medication;
  quantity: number;
}

export interface Slot {
  id: string;
  drawer_id: string;
  slot_number: number;
  medications: SlotMedicationItem[];
  max_pill_capacity: number;
}

export interface Drawer {
  id: string;
  dispenser_id: string;
  drawer_number: number;
  slots: Slot[];
}

export interface DispenserDetails extends Dispenser {
  drawers: Drawer[];
}

export interface Schedule {
  id: string;
  slot_id: string;
  scheduled_time?: string; // Legacy alias
  scheduled_at?: string | null;
  time?: string;
  is_active: boolean;
}

export interface ScheduleInput {
  slot_id: string;
  time: string;
  is_active: boolean;
  patient_id?: string;
  dispenser_id?: string;
}

export function getScheduleTime(schedule: Schedule) {
  return schedule.time ?? schedule.scheduled_time ?? "";
}

// Medications
export async function listMedications() {
  return requestJson<Medication[]>("/medications");
}

export async function createMedication(input: { name: string; dosage?: string; description?: string | null }) {
  return requestJson<Medication>("/medications", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Dispenser Status (Telemetry)
export async function getDispenserStatus(hardwareId: string) {
  return requestJson<DispenserStatusPublic>(`/dispensers/${hardwareId}/status`);
}

// Dispensers with drawers and slots
// If the backend doesn't support /api/dispensers/{id} fully yet, we will fallback to mock
export async function getDispenserDetails(dispenserId: string): Promise<DispenserDetails> {
  try {
    const data = await requestJson<DispenserDetails>(`/dispensers/${dispenserId}`);
    return data;
  } catch (err) {
    console.warn("Backend might not have /dispensers/:id with drawers. Using mock.");
    // Mock fallback
    return {
      id: dispenserId,
      hardware_id: dispenserId, // simplified
      patient_id: null,
      patient_name: null,
      is_online: false,
      critical_stock: false,
      last_sync: null,
      drawers: [
        {
          id: "drawer-1",
          dispenser_id: dispenserId,
          drawer_number: 1,
          slots: [
            {
              id: "slot-1",
              drawer_id: "drawer-1",
              slot_number: 1,
              medications: [],
              max_pill_capacity: 30,
            }
          ]
        },
        {
          id: "drawer-2",
          dispenser_id: dispenserId,
          drawer_number: 2,
          slots: [
            {
              id: "slot-2",
              drawer_id: "drawer-2",
              slot_number: 1,
              medications: [
                {
                  medication: { id: "med-1", name: "Aspirina", dosage: "100mg" },
                  quantity: 5,
                }
              ],
              max_pill_capacity: 30,
            }
          ]
        }
      ]
    };
  }
}

// Update Slot (Gaveta)
export async function updateSlot(slotId: string, input: Partial<Slot>) {
  return requestJson<Slot>(`/slots/${slotId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function addSlotMedication(slotId: string, medicationId: string, quantity: number) {
  return requestJson<Slot>(`/slots/${slotId}/medications`, {
    method: "POST",
    body: JSON.stringify({ medication_id: medicationId, quantity }),
  });
}

export async function updateSlotMedicationQuantity(slotId: string, medicationId: string, quantity: number) {
  return requestJson<Slot>(`/slots/${slotId}/medications/${medicationId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export async function removeSlotMedication(slotId: string, medicationId: string) {
  return requestJson<Slot>(`/slots/${slotId}/medications/${medicationId}`, {
    method: "DELETE",
  });
}

// Schedules
export async function listSchedules(dispenserId?: string) {
  const url = dispenserId ? `/schedules?dispenser_id=${dispenserId}` : "/schedules";
  return requestJson<Schedule[]>(url);
}

export async function createSchedule(input: ScheduleInput) {
  return requestJson<Schedule>("/schedules", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSchedule(scheduleId: string, input: Partial<ScheduleInput>) {
  return requestJson<Schedule>(`/schedules/${scheduleId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteSchedule(scheduleId: string) {
  await requestJson<void>(`/schedules/${scheduleId}`, {
    method: "DELETE",
  });
}
