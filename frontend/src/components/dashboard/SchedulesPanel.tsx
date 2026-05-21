import { useState, useEffect } from "react";
import {
  Schedule,
  DispenserDetails,
  listSchedules,
  updateSchedule,
  deleteSchedule,
  createSchedule,
  ScheduleInput,
  getScheduleQuantity,
  getScheduleTime,
} from "../../lib/api";

interface SchedulesPanelProps {
  dispenser: DispenserDetails;
  refreshToken?: number;
}

export function SchedulesPanel({ dispenser, refreshToken }: SchedulesPanelProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const data = await listSchedules(dispenser.id);
      setSchedules(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [dispenser.id, refreshToken]);

  const toggleActive = async (schedule: Schedule) => {
    try {
      // optimistic update
      setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, is_active: !s.is_active } : s));
      await updateSchedule(schedule.id, { is_active: !schedule.is_active });
    } catch (err) {
      console.error(err);
      fetchSchedules(); // revert on error
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este horário?")) return;
    try {
      await deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erro ao remover horário.");
    }
  };

  return (
    <div style={{ marginBottom: "var(--space-8)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
        <h2 style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xl)",
          fontWeight: 700,
          color: "var(--ink)",
          margin: 0,
        }}>
          Agendamentos
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          style={{
            background: "var(--primary)",
            color: "var(--primary-on)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "8px 16px",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <i className="ph-bold ph-plus" /> Adicionar
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--ink-3)" }}>Carregando agendamentos...</div>
      ) : schedules.length === 0 ? (
        <div style={{
          background: "var(--surface)",
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--ink-2)",
        }}>
          Nenhum horário agendado. Clique em "Adicionar" para criar o primeiro.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {schedules.map(schedule => (
            <div key={schedule.id} style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: schedule.is_active ? 1 : 0.6,
              transition: "opacity 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                <div style={{
                  fontSize: "var(--text-2xl)",
                  fontWeight: 700,
                  color: schedule.is_active ? "var(--primary)" : "var(--ink-3)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {getScheduleTime(schedule).substring(0, 5)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "var(--text-base)" }}>
                    {schedule.medication ? schedule.medication.name : "Medicamento"}
                  </div>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
                    {getScheduleQuantity(schedule)} pílula(s)
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                {/* Toggle switch */}
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={schedule.is_active}
                    onChange={() => toggleActive(schedule)}
                    style={{ display: "none" }}
                  />
                  <div style={{
                    width: "40px",
                    height: "24px",
                    background: schedule.is_active ? "var(--primary)" : "var(--border)",
                    borderRadius: "12px",
                    position: "relative",
                    transition: "background 0.2s",
                  }}>
                    <div style={{
                      width: "18px",
                      height: "18px",
                      background: "white",
                      borderRadius: "50%",
                      position: "absolute",
                      top: "3px",
                      left: schedule.is_active ? "19px" : "3px",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }} />
                  </div>
                </label>

                {/* Edit Button */}
                <button
                  onClick={() => setEditingSchedule(schedule)}
                  style={iconButtonStyle}
                  title="Editar"
                >
                  <i className="ph-duotone ph-pencil-simple" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleRemove(schedule.id)}
                  style={{ ...iconButtonStyle, color: "var(--danger, #ef4444)" }}
                  title="Remover"
                >
                  <i className="ph-duotone ph-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(isAdding || editingSchedule) && (
        <ScheduleModal
          dispenser={dispenser}
          schedule={editingSchedule}
          onClose={() => { setIsAdding(false); setEditingSchedule(null); }}
          onSuccess={() => { setIsAdding(false); setEditingSchedule(null); fetchSchedules(); }}
        />
      )}
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ink-2)",
  cursor: "pointer",
  fontSize: "1.25rem",
  padding: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "4px",
};

function ScheduleModal({ dispenser, schedule, onClose, onSuccess }: any) {
  const isEditing = !!schedule;
  const [time, setTime] = useState(schedule ? getScheduleTime(schedule).substring(0, 5) : "08:00");
  const [slotId, setSlotId] = useState(schedule ? schedule.slot_id : (dispenser.drawers[0]?.slots[0]?.id || ""));
  const [pills, setPills] = useState(schedule ? String(getScheduleQuantity(schedule)) : "1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: ScheduleInput = {
        slot_id: slotId,
        medication_id: "med-id-placeholder", // in real app, find by slot
        time: `${time}:00`,
        quantity: parseInt(pills) || 1,
        is_active: schedule ? schedule.is_active : true,
        dispenser_id: dispenser.id,
      };

      if (isEditing) {
        await updateSchedule(schedule.id, payload);
      } else {
        await createSchedule(payload);
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar horário");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 50,
      padding: "var(--space-4)",
    }}>
      <div style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      }}>
        <h3 style={{ marginTop: 0, marginBottom: "var(--space-4)", fontSize: "var(--text-lg)" }}>
          {isEditing ? "Editar Horário" : "Novo Horário"}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>Hora</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>Posição</label>
            <select
              value={slotId}
              onChange={e => setSlotId(e.target.value)}
              required
              style={inputStyle}
            >
              {dispenser.drawers.map((drawer: any) =>
                drawer.slots.map((slot: any) => (
                  <option key={slot.id} value={slot.id}>
                    Posição {slot.slot_number} - {slot.medication ? slot.medication.name : "Vazio"}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>Quantidade de Pílulas</label>
            <input
              type="number"
              value={pills}
              onChange={e => setPills(e.target.value)}
              min="1"
              required
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "var(--primary)",
                color: "var(--primary-on)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border)",
  fontSize: "var(--text-base)",
  boxSizing: "border-box",
};
