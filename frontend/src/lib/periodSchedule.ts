import type { PeriodSchedule } from "./api";

const PERIOD_LABELS: Record<string, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  night: "Noite",
};

export function toTimeInputValue(raw: string): string {
  if (!raw) return "08:00";
  if (raw.includes("T")) {
    const part = raw.split("T")[1];
    return part ? part.slice(0, 5) : "08:00";
  }
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

export interface NextDispenseInfo {
  periodKey: string;
  periodLabel: string;
  timeLabel: string;
  target: Date;
  secondsRemaining: number;
}

export function computeNextDispense(
  schedule: PeriodSchedule | null,
  now: Date = new Date(),
): NextDispenseInfo | null {
  if (!schedule?.is_active) return null;

  const entries = [
    { key: "morning", time: schedule.morning_time },
    { key: "afternoon", time: schedule.afternoon_time },
    { key: "night", time: schedule.night_time },
  ];

  let best: NextDispenseInfo | null = null;

  for (const entry of entries) {
    const timeLabel = toTimeInputValue(entry.time);
    const [hours, minutes] = timeLabel.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) continue;

    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    const secondsRemaining = Math.max(
      0,
      Math.floor((target.getTime() - now.getTime()) / 1000),
    );

    if (!best || secondsRemaining < best.secondsRemaining) {
      best = {
        periodKey: entry.key,
        periodLabel: PERIOD_LABELS[entry.key] ?? entry.key,
        timeLabel,
        target,
        secondsRemaining,
      };
    }
  }

  return best;
}

export function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return `${hours}h ${mm}m ${ss}s`;
  }
  return `${minutes}m ${ss}s`;
}

export function nextPeriodLabel(schedule: PeriodSchedule | null, now: Date = new Date()): string {
  const next = computeNextDispense(schedule, now);
  if (!next) return "—";
  return `${next.periodLabel} às ${next.timeLabel}`;
}
