import { useState, useEffect } from "react";
import {
  Schedule,
  DispenserDetails,
  listSchedules,
  updateSchedule,
  deleteSchedule,
  createSchedule,
  ScheduleInput,
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
      setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, is_active: !s.is_active } : s));
      await updateSchedule(schedule.id, { is_active: !schedule.is_active });
    } catch (err) {
      console.error(err);
      fetchSchedules(); 
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
          {schedules.map(schedule => {
            // Find slot number for display
            let displaySlotNum = "?";
            for (const d of dispenser.drawers) {
              const f = d.slots.find(sl => String(sl.id) === String(schedule.slot_id));
              if (f) displaySlotNum = String(f.slot_number);
            }

            return (
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
                    fontSize: "var(--text-lg)",
                    fontWeight: 700,
                    color: schedule.is_active ? "var(--primary)" : "var(--ink-3)",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {(() => {
                      const t = getScheduleTime(schedule);
                      if (t.includes('T')) {
                        const d = new Date(t);
                        if (!isNaN(d.getTime())) {
                          return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                        }
                      }
                      return t.substring(0, 5);
                    })()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "var(--text-base)" }}>
                      Dispensar Posição {displaySlotNum}
                    </div>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
                      Todo o conteúdo do slot será dispensado
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
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

                  <button
                    onClick={() => setEditingSchedule(schedule)}
                    style={iconButtonStyle}
                    title="Editar"
                  >
                    <i className="ph-duotone ph-pencil-simple" />
                  </button>

                  <button
                    onClick={() => handleRemove(schedule.id)}
                    style={{ ...iconButtonStyle, color: "var(--danger, #ef4444)" }}
                    title="Remover"
                  >
                    <i className="ph-duotone ph-trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(isAdding || editingSchedule) && (
        <ScheduleModal
          dispenser={dispenser}
          schedule={editingSchedule}
          allSchedules={schedules}
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

function ScheduleModal({ dispenser, schedule, onClose, onSuccess, allSchedules }: any) {
  const isEditing = !!schedule;
  
  const getInitialTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const defaultTime = now.toISOString().slice(0, 16);
    
    if (!schedule) return defaultTime;
    const t = getScheduleTime(schedule);
    if (t.includes('T')) return t.slice(0, 16);
    return now.toISOString().slice(0, 11) + t.slice(0, 5);
  };

  const [time, setTime] = useState(getInitialTime());
  const defaultSlotId = dispenser.drawers[0]?.slots.find((s: any) => s.slot_number !== 31)?.id || "";
  const [slotId, setSlotId] = useState(schedule ? schedule.slot_id : defaultSlotId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação cronológica dos slots
    let selectedSlotNum = 0;
    for (const d of dispenser.drawers) {
      const f = d.slots.find((sl: any) => String(sl.id) === String(slotId));
      if (f) selectedSlotNum = f.slot_number;
    }

    if (allSchedules) {
      for (const otherSchedule of allSchedules) {
        if (schedule && String(otherSchedule.id) === String(schedule.id)) continue;
        
        let otherSlotNum = 0;
        for (const d of dispenser.drawers) {
          const f = d.slots.find((sl: any) => String(sl.id) === String(otherSchedule.slot_id));
          if (f) otherSlotNum = f.slot_number;
        }
        
        if (otherSlotNum === 0 || selectedSlotNum === 0) continue;
        
        let otherTime = getScheduleTime(otherSchedule);
        if (!otherTime.includes('T')) {
          const now = new Date();
          now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          otherTime = now.toISOString().slice(0, 11) + otherTime.slice(0, 5);
        } else {
          otherTime = otherTime.slice(0, 16);
        }
        
        const selectedDate = new Date(time);
        const otherDate = new Date(otherTime);
        const diffMinutes = (selectedDate.getTime() - otherDate.getTime()) / 60000;
        
        if (selectedSlotNum > otherSlotNum && diffMinutes < 5) {
          alert(`Erro cronológico: O Slot ${selectedSlotNum} deve ter pelo menos 5 minutos de diferença após o Slot ${otherSlotNum} (agendado para ${otherTime.replace('T', ' ')}).`);
          return;
        }
        
        if (selectedSlotNum < otherSlotNum && diffMinutes > -5) {
          alert(`Erro cronológico: O Slot ${selectedSlotNum} deve ter pelo menos 5 minutos de diferença antes do Slot ${otherSlotNum} (agendado para ${otherTime.replace('T', ' ')}).`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload: ScheduleInput = {
        slot_id: slotId,
        time: time, // Now saving full datetime string: YYYY-MM-DDTHH:MM
        is_active: schedule ? schedule.is_active : true,
        dispenser_id: dispenser.id,
        patient_id: dispenser.patient_id,
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
            <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>Data e Hora</label>
            <input
              type="datetime-local"
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
                drawer.slots
                  .filter((slot: any) => slot.slot_number !== 31)
                  .map((slot: any) => (
                    <option key={slot.id} value={slot.id}>
                      Posição {slot.slot_number} - {slot.medications && slot.medications.length > 0 ? `${slot.medications.length} med(s)` : "Vazio"}
                    </option>
                  ))
              )}
            </select>
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
