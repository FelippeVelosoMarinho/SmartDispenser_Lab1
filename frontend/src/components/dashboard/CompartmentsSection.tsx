import React, { useEffect, useState } from "react";
import {
  DispenserDetails,
  Medication,
  Schedule,
  Slot,
  createMedication,
  createSchedule,
  deleteSchedule,
  getScheduleQuantity,
  getScheduleTime,
  listMedications,
  listSchedules,
  updateSlot,
} from "../../lib/api";

interface CompartmentsSectionProps {
  dispenser: DispenserDetails;
  onSchedulesChange: () => void;
  onDispenserChange: () => void;
}

function AnnularSlice({
  cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, onClick, isActive, onMouseEnter, onMouseLeave
}: any) {
  // convert angle to radians
  const startRad = (startAngle - 90) * (Math.PI / 180);
  const endRad = (endAngle - 90) * (Math.PI / 180);

  const x1 = cx + outerRadius * Math.cos(startRad);
  const y1 = cy + outerRadius * Math.sin(startRad);
  const x2 = cx + outerRadius * Math.cos(endRad);
  const y2 = cy + outerRadius * Math.sin(endRad);
  
  const x3 = cx + innerRadius * Math.cos(endRad);
  const y3 = cy + innerRadius * Math.sin(endRad);
  const x4 = cx + innerRadius * Math.cos(startRad);
  const y4 = cy + innerRadius * Math.sin(startRad);

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  const d = [
    `M ${x1} ${y1}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
    `Z`
  ].join(" ");

  return (
    <path
      d={d}
      fill={fill}
      stroke="var(--canvas)"
      strokeWidth={isActive ? "4" : "2"}
      strokeLinejoin="round"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        transformOrigin: `${cx}px ${cy}px`,
        transform: isActive ? "scale(1.05)" : "scale(1)",
        filter: isActive ? "drop-shadow(0 10px 15px rgba(16, 185, 129, 0.2))" : "none",
      }}
    />
  );
}

export function CompartmentsSection({ dispenser, onSchedulesChange, onDispenserChange }: CompartmentsSectionProps) {
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);

  // Obter todos os slots reais do banco
  const dbSlots = dispenser.drawers.flatMap(d => d.slots);

  // Garantir exatamente 21 posições (slots) na visão circular
  const allSlots = Array.from({ length: 21 }, (_, i) => {
    const slotNumber = i + 1;
    const existingSlot = dbSlots.find(s => s.slot_number === slotNumber);
    if (existingSlot) {
      return { ...existingSlot, display_number: slotNumber, is_virtual: false };
    }
    return {
      id: `virtual-${slotNumber}`,
      slot_number: slotNumber,
      display_number: slotNumber,
      drawer_id: "",
      medication_id: null,
      medication: null,
      current_pill_count: 0,
      max_pill_capacity: 0,
      is_virtual: true,
    };
  });

  const totalSlices = 21;
  const anglePerSlice = 360 / totalSlices;

  const cx = 220;
  const cy = 220;
  const outerRadius = 198;
  const innerRadius = 112;

  const displaySlot = allSlots.find(s => s.id === hoveredSlotId) || allSlots.find(s => s.id === editingSlot?.id) || allSlots[0];

  const renderSlice = (slot: any, index: number) => {
    const startAngle = index * anglePerSlice;
    const endAngle = (index + 1) * anglePerSlice;
    const fillPercentage = slot.max_pill_capacity > 0 ? (slot.current_pill_count / slot.max_pill_capacity) * 100 : 0;
    
    let fill = "var(--surface-dim)"; // Empty / No medication
    if (slot.medication_id || slot.current_pill_count > 0) {
      if (fillPercentage > 20) fill = "var(--primary)";
      else if (fillPercentage > 0) fill = "var(--warning)"; // Medium/Low
      else fill = "var(--danger)"; // Empty but configured
    }

    const isActive = hoveredSlotId === slot.id || editingSlot?.id === slot.id;

    return (
      <AnnularSlice
        key={slot.id}
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        isActive={isActive}
        onClick={() => setEditingSlot(slot)}
        onMouseEnter={() => setHoveredSlotId(slot.id)}
        onMouseLeave={() => setHoveredSlotId(null)}
      />
    );
  };

  return (
    <div style={{ marginBottom: "var(--space-8)" }}>
      <h2 style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xl)",
        fontWeight: 700,
        color: "var(--ink)",
        marginBottom: "var(--space-4)",
      }}>
        Slots / Posições (Visão Circular)
      </h2>

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-8)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        <div style={{ position: "relative", width: 440, height: 440 }}>
          <svg width={440} height={440} viewBox="0 0 440 440" style={{ overflow: "visible" }}>
            {/* Draw non-active slices first */}
            {allSlots.map((slot, index) => {
              const isActive = hoveredSlotId === slot.id || editingSlot?.id === slot.id;
              if (isActive) return null;
              return renderSlice(slot, index);
            })}
            {/* Draw active slices on top */}
            {allSlots.map((slot, index) => {
              const isActive = hoveredSlotId === slot.id || editingSlot?.id === slot.id;
              if (!isActive) return null;
              return renderSlice(slot, index);
            })}
          </svg>

          {/* Center Info Overlay */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: innerRadius * 1.6,
            textAlign: "center",
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {displaySlot ? (
              <>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-3)", fontWeight: 600, marginBottom: "4px" }}>
                  Posição {displaySlot.display_number}
                </div>
                <div style={{ fontSize: "var(--text-lg)", color: "var(--ink)", fontWeight: 700, marginBottom: "4px", lineHeight: 1.2 }}>
                  {displaySlot.medication ? displaySlot.medication.name : "Vazio"}
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)", fontWeight: 500 }}>
                  {displaySlot.current_pill_count} / {displaySlot.max_pill_capacity} unid.
                </div>
                {displaySlot.current_pill_count > 0 && displaySlot.max_pill_capacity > 0 && (
                   <div style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)", marginTop: "4px" }}>
                     {Math.round((displaySlot.current_pill_count / displaySlot.max_pill_capacity) * 100)}% Cheio
                   </div>
                )}
              </>
            ) : (
              <div style={{ color: "var(--ink-3)" }}>Selecione uma posição</div>
            )}
          </div>
        </div>
        
        {/* Legend */}
        <div style={{
          display: "flex",
          gap: "var(--space-4)",
          marginTop: "var(--space-6)",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--primary)" }} />
            Estoque Bom
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--warning, #f59e0b)" }} />
            Estoque Baixo
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--danger)" }} />
            Esvaziado
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--surface-dim)" }} />
            Não Configurado
          </div>
        </div>

        <p style={{ marginTop: "var(--space-6)", color: "var(--ink-3)", fontSize: "var(--text-sm)" }}>
          Passe o mouse ou clique em uma posição para ver os detalhes e editar seu conteúdo.
        </p>
      </div>

      {editingSlot && (
        <SlotMedicationsModal
          dispenser={dispenser}
          slot={editingSlot}
          onClose={() => setEditingSlot(null)}
          onSchedulesChange={onSchedulesChange}
          onDispenserChange={onDispenserChange}
        />
      )}
    </div>
  );
}

type SlotSchedule = Schedule & {
  time?: string;
  quantity?: number;
};

function SlotMedicationsModal({ slot, dispenser, onClose, onSchedulesChange, onDispenserChange }: any) {
  const [schedules, setSchedules] = useState<SlotSchedule[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedMedicationId, setSelectedMedicationId] = useState("");
  const [newMedicationName, setNewMedicationName] = useState("");
  const [newMedicationDosage, setNewMedicationDosage] = useState("");
  const [newMedicationDescription, setNewMedicationDescription] = useState("");
  const [slotStockCount, setSlotStockCount] = useState("0");
  const [time, setTime] = useState("08:00");
  const [quantity, setQuantity] = useState("1");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVirtualSlot = String(slot.id).startsWith("virtual-");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [scheduleData, medicationData] = await Promise.all([
        listSchedules(dispenser.id),
        listMedications(),
      ]);

      const slotSchedules = scheduleData.filter((schedule) => String(schedule.slot_id) === String(slot.id));
      setSchedules(slotSchedules as SlotSchedule[]);
      setMedications(medicationData);
      setSelectedMedicationId((current) => current || slot.medication_id || medicationData[0]?.id || "");
      setSlotStockCount(String(slot.current_pill_count ?? 0));
    } catch (err) {
      console.error(err);
      setSchedules([]);
      alert("Não foi possível carregar os remédios desse slot.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [dispenser.id, slot.id]);

  const medicationById = new Map(medications.map((medication) => [medication.id, medication]));
  const totalQuantity = schedules.reduce((sum, schedule) => sum + getScheduleQuantity(schedule), 0);
  const activeMedicationId = selectedMedicationId.trim() || (slot.medication_id ?? "");

  const ensureMedication = async () => {
    const trimmedMedicationId = selectedMedicationId.trim();
    if (trimmedMedicationId) {
      return trimmedMedicationId;
    }

    const name = newMedicationName.trim();
    if (!name) {
      throw new Error("Escolha um medicamento existente ou cadastre um novo.");
    }

    const createdMedication = await createMedication({
      name,
      dosage: newMedicationDosage.trim() || undefined,
      description: newMedicationDescription.trim() || undefined,
    });

    setMedications((current) => [createdMedication, ...current]);
    setSelectedMedicationId(createdMedication.id);
    return createdMedication.id;
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVirtualSlot) {
      alert("Essa posição ainda não existe no banco.");
      return;
    }
    if (!dispenser.patient_id) {
      alert("Esse dispenser não está vinculado a um paciente.");
      return;
    }

    const stockValue = Number(slotStockCount);
    if (!Number.isInteger(stockValue) || stockValue < 0) {
      alert("Informe uma quantidade válida para o estoque do slot.");
      return;
    }

    setIsSubmitting(true);
    try {
      const medicationId = await ensureMedication();
      await updateSlot(String(slot.id), {
        medication_id: medicationId,
        current_pill_count: stockValue,
      });
      await loadData();
      onDispenserChange();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar o slot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVirtualSlot) {
      alert("Essa posição ainda não existe no banco.");
      return;
    }
    if (!dispenser.patient_id) {
      alert("Esse dispenser não está vinculado a um paciente.");
      return;
    }

    const medicationId = activeMedicationId;
    if (!medicationId) {
      alert("Salve ou selecione um medicamento antes de criar um agendamento.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createSchedule({
        slot_id: String(slot.id),
        medication_id: medicationId,
        time: `${time}:00`,
        quantity: parseInt(quantity, 10) || 1,
        is_active: true,
        patient_id: dispenser.patient_id,
        dispenser_id: dispenser.id,
      });
      await loadData();
      onSchedulesChange();
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar remédio ao slot");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSchedule = async (scheduleId: string) => {
    if (!confirm("Tem certeza que deseja remover este remédio do slot?")) return;

    setIsSubmitting(true);
    try {
      await deleteSchedule(scheduleId);
      await loadData();
      onSchedulesChange();
    } catch (err) {
      console.error(err);
      alert("Erro ao remover remédio do slot");
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
        maxWidth: "920px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: "var(--space-2)", fontSize: "var(--text-lg)" }}>
              Posição {slot.display_number}
            </h3>
            <p style={{ margin: 0, color: "var(--ink-2)", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
              Clique em um medicamento do catálogo ou cadastre um novo item para salvar este slot diretamente no banco.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.95fr)",
          gap: "var(--space-6)",
          marginTop: "var(--space-6)",
        }}>
          <section style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-5)",
            background: "var(--surface-subtle, rgba(255,255,255,0.35))",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--ink)" }}>Salvar medicamento no slot</h4>
                <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
                  O slot atualiza o vínculo com o medicamento e o estoque inicial.
                </p>
              </div>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
                {medications.length} medicamento(s) no catálogo
              </span>
            </div>

            {isLoading ? (
              <div style={{ padding: "var(--space-6) 0", textAlign: "center", color: "var(--ink-3)" }}>
                Carregando remédios...
              </div>
            ) : (
              <form onSubmit={handleSaveSlot} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>
                    Medicamento do catálogo
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {medications.map((medication) => (
                      <button
                        key={medication.id}
                        type="button"
                        onClick={() => {
                          setSelectedMedicationId(medication.id);
                          setNewMedicationName("");
                          setNewMedicationDosage("");
                          setNewMedicationDescription("");
                        }}
                        style={{
                          border: medication.id === activeMedicationId ? "1px solid var(--primary)" : "1px solid var(--border)",
                          background: medication.id === activeMedicationId ? "rgba(16, 185, 129, 0.08)" : "var(--surface)",
                          color: "var(--ink)",
                          borderRadius: "999px",
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        {medication.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-3)" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>Novo medicamento</label>
                    <input
                      type="text"
                      value={newMedicationName}
                      onChange={(event) => {
                        setNewMedicationName(event.target.value);
                        if (selectedMedicationId) setSelectedMedicationId("");
                      }}
                      placeholder="Ex.: Ritalina"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>Dosagem</label>
                    <input
                      type="text"
                      value={newMedicationDosage}
                      onChange={(event) => setNewMedicationDosage(event.target.value)}
                      placeholder="Ex.: 10 mg"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>Descrição</label>
                  <textarea
                    value={newMedicationDescription}
                    onChange={(event) => setNewMedicationDescription(event.target.value)}
                    placeholder="Observações opcionais sobre o medicamento"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical", minHeight: "84px" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-3)" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>Estoque inicial no slot</label>
                    <input
                      type="number"
                      value={slotStockCount}
                      onChange={(event) => setSlotStockCount(event.target.value)}
                      min="0"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "end" }}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        borderRadius: "var(--radius-md)",
                        border: "none",
                        background: "var(--primary)",
                        color: "var(--primary-on)",
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity: isSubmitting ? 0.7 : 1,
                      }}
                    >
                      {isSubmitting ? "Salvando..." : "Salvar no slot"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>

          <section style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-5)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
              <div>
                <h4 style={{ marginTop: 0, marginBottom: "var(--space-1)", fontSize: "var(--text-base)", color: "var(--ink)" }}>Agendamentos do slot</h4>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
                  Esses horários também vêm do banco e podem ser removidos aqui.
                </p>
              </div>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
                {schedules.length} registro(s) · total {totalQuantity} unid.
              </span>
            </div>

            {isLoading ? (
              <div style={{ padding: "var(--space-6) 0", textAlign: "center", color: "var(--ink-3)" }}>
                Carregando remédios...
              </div>
            ) : schedules.length === 0 ? (
              <div style={{
                border: "1px dashed var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-5)",
                color: "var(--ink-2)",
                textAlign: "center",
                marginBottom: "var(--space-4)",
              }}>
                Nenhum agendamento cadastrado nesse slot ainda.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
                {schedules.map((schedule) => {
                  const medication = schedule.medication ?? medicationById.get(schedule.medication_id) ?? null;
                  const scheduleTime = getScheduleTime(schedule).substring(0, 5) || "--:--";
                  const scheduleQuantity = getScheduleQuantity(schedule);

                  return (
                    <div
                      key={schedule.id}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        padding: "var(--space-4)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "var(--space-4)",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                          {medication?.name ?? `Medicamento ${schedule.medication_id}`}
                        </div>
                        <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                          <span>ID {schedule.medication_id}</span>
                          <span>Quantidade {scheduleQuantity}</span>
                          <span>Horário {scheduleTime}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSchedule(schedule.id)}
                        disabled={isSubmitting}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          background: "rgba(239, 68, 68, 0.08)",
                          color: "var(--danger, #ef4444)",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={handleAddSchedule} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>
                  Medicamento do agendamento
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {medications.map((medication) => (
                    <button
                      key={medication.id}
                      type="button"
                      onClick={() => setSelectedMedicationId(medication.id)}
                      style={{
                        border: medication.id === activeMedicationId ? "1px solid var(--primary)" : "1px solid var(--border)",
                        background: medication.id === activeMedicationId ? "rgba(16, 185, 129, 0.08)" : "var(--surface)",
                        color: "var(--ink)",
                        borderRadius: "999px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      {medication.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-3)" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>Horário</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>Quantidade</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    min="1"
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !activeMedicationId}
                style={{
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "var(--primary)",
                  color: "var(--primary-on)",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: isSubmitting || !activeMedicationId ? 0.7 : 1,
                }}
              >
                {isSubmitting ? "Salvando..." : "Adicionar agendamento"}
              </button>
            </form>
          </section>
        </div>
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
