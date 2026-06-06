import React, { useEffect, useState } from "react";
import type {
  DispenserDetails,
  Medication,
} from "../../lib/api";
import {
  createMedication,
  listMedications,
  addSlotMedication,
  removeSlotMedication,
  updateSlotMedicationQuantity,
} from "../../lib/api";
import { useHardwareStatus } from "./PeriodScheduleSection";

interface CompartmentsSectionProps {
  dispenser: DispenserDetails;
  onDispenserChange: () => void;
}

function AnnularSlice({
  cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, onClick, isActive, onMouseEnter, onMouseLeave, isUnprogrammable
}: any) {
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
        cursor: isUnprogrammable ? "not-allowed" : "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        transformOrigin: `${cx}px ${cy}px`,
        transform: isActive ? "scale(1.05)" : "scale(1)",
        filter: isActive ? "drop-shadow(0 10px 15px rgba(16, 185, 129, 0.2))" : "none",
        opacity: isUnprogrammable ? 0.3 : 1,
      }}
    />
  );
}

export function CompartmentsSection({ dispenser, onDispenserChange }: CompartmentsSectionProps) {
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const hwStatus = useHardwareStatus(dispenser.hardware_id, dispenser.is_online);
  const nextDoseNumber =
    hwStatus != null
      ? Math.min(hwStatus.current_slot + 1, Math.min(hwStatus.total_slots, 21))
      : null;

  const dbSlots = dispenser.drawers.flatMap(d => d.slots);

  const allSlots = Array.from({ length: 31 }, (_, i) => {
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
      medications: [],
      max_pill_capacity: 0,
      is_virtual: true,
    } as any;
  });

  const editingSlot = allSlots.find(s => s.id === editingSlotId) || null;

  const totalSlices = 31;
  const anglePerSlice = 360 / totalSlices;

  const cx = 220;
  const cy = 220;
  const outerRadius = 198;
  const innerRadius = 112;

  const displaySlot = allSlots.find(s => s.id === hoveredSlotId) || editingSlot || allSlots[0];

  const renderSlice = (slot: any, index: number) => {
    const isUnprogrammable = slot.display_number === 31;
    // Para que o Slot 1 fique na antiga posição 14 (visualIndex 13)
    // E os próximos cresçam no sentido ANTI-HORÁRIO, diminuímos o visualIndex.
    const visualIndex = (13 - index + totalSlices) % totalSlices;
    const startAngle = visualIndex * anglePerSlice;
    const endAngle = (visualIndex + 1) * anglePerSlice;
    const totalPills = slot.medications?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
    const fillPercentage = slot.max_pill_capacity > 0 ? (totalPills / slot.max_pill_capacity) * 100 : 0;
    
    let fill = "var(--surface-dim)";
    if (isUnprogrammable) {
       fill = "var(--surface-dim)";
    } else if (slot.max_pill_capacity > 0) {
      if (fillPercentage >= 80) fill = "var(--danger)";
      else if (fillPercentage >= 40) fill = "var(--warning)";
      else fill = "var(--success, #10b981)";
    }

    const isNextDose =
      nextDoseNumber != null &&
      slot.display_number === nextDoseNumber &&
      slot.display_number <= 21;

    const isActive = hoveredSlotId === slot.id || editingSlotId === slot.id || isNextDose;

    return (
      <AnnularSlice
        key={slot.id}
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        isActive={!isUnprogrammable && isActive}
        isUnprogrammable={isUnprogrammable}
        onClick={() => { if (!isUnprogrammable) setEditingSlotId(slot.id); }}
        onMouseEnter={() => { if (!isUnprogrammable) setHoveredSlotId(slot.id); }}
        onMouseLeave={() => { if (!isUnprogrammable) setHoveredSlotId(null); }}
      />
    );
  };

  const displayTotalPills = displaySlot.medications?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

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
      {nextDoseNumber != null && (
        <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--primary)" }}>
          Próxima dose: compartimento <strong>{nextDoseNumber}</strong>
          {hwStatus?.awaiting_confirm ? " (aguardando confirmação no aparelho)" : ""}
        </p>
      )}

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
            {allSlots.map((slot, index) => {
              const isActive = hoveredSlotId === slot.id || editingSlotId === slot.id;
              if (isActive) return null;
              return renderSlice(slot, index);
            })}
            {allSlots.map((slot, index) => {
              const isActive = hoveredSlotId === slot.id || editingSlotId === slot.id;
              if (!isActive) return null;
              return renderSlice(slot, index);
            })}
          </svg>

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
                  {displaySlot.medications?.length > 0 
                     ? (displaySlot.medications.length === 1 ? displaySlot.medications[0].medication.name : `${displaySlot.medications.length} Medicamentos`) 
                     : "Vazio"}
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)", fontWeight: 500 }}>
                  {displayTotalPills} / {displaySlot.max_pill_capacity} unid.
                </div>
                {displayTotalPills > 0 && displaySlot.max_pill_capacity > 0 && (
                   <div style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)", marginTop: "4px" }}>
                     {Math.round((displayTotalPills / displaySlot.max_pill_capacity) * 100)}% Cheio
                   </div>
                )}
              </>
            ) : (
              <div style={{ color: "var(--ink-3)" }}>Selecione uma posição</div>
            )}
          </div>
        </div>
        
        <div style={{
          display: "flex",
          gap: "var(--space-4)",
          marginTop: "var(--space-6)",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--success, #10b981)" }} />
            Vazio / Disponível
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--warning, #f59e0b)" }} />
            Enchendo
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--danger)" }} />
            Cheio / Atenção
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
          onClose={() => setEditingSlotId(null)}
          onDispenserChange={onDispenserChange}
        />
      )}
    </div>
  );
}

function SlotMedicationsModal({ slot, dispenser, onClose, onDispenserChange }: any) {
  const [medicationsCatalog, setMedicationsCatalog] = useState<Medication[]>([]);
  const [selectedMedicationId, setSelectedMedicationId] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  
  // State for creating a new medication on the fly
  const [newMedicationName, setNewMedicationName] = useState("");
  const [newMedicationDosage, setNewMedicationDosage] = useState("");
  // unused: const [newMedicationDescription, setNewMedicationDescription] = useState("");
  
  // State for inline editing quantity
  const [editingQtyMedId, setEditingQtyMedId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVirtualSlot = String(slot.id).startsWith("virtual-");
  const slotMedications = slot.medications || [];

  const loadData = async () => {
    setIsLoading(true);
    try {
      const medicationData = await listMedications();
      setMedicationsCatalog(medicationData);
      if (medicationData.length > 0) {
        setSelectedMedicationId(medicationData[0].id);
      }
    } catch (err) {
      console.error(err);
      alert("Não foi possível carregar o catálogo de remédios.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [dispenser.id, slot.id]);

  const activeMedicationId = selectedMedicationId.trim();

  const ensureMedication = async () => {
    if (activeMedicationId) return activeMedicationId;

    const name = newMedicationName.trim();
    if (!name) {
      throw new Error("Escolha um medicamento existente ou cadastre um novo.");
    }

    const createdMedication = await createMedication({
      name,
      dosage: newMedicationDosage.trim() || undefined,
      description: undefined,
    });

    setMedicationsCatalog((current) => [createdMedication, ...current]);
    setSelectedMedicationId(createdMedication.id);
    return createdMedication.id;
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVirtualSlot) {
      alert("Essa posição ainda não existe no banco.");
      return;
    }

    const qty = parseInt(newQuantity, 10);
    if (!Number.isInteger(qty) || qty <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }

    setIsSubmitting(true);
    try {
      const medId = await ensureMedication();
      await addSlotMedication(slot.id, medId, qty);
      await onDispenserChange();
      setNewQuantity("1");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao adicionar medicamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveInlineQuantity = async (medicationId: string) => {
    const qty = parseInt(editingQtyValue, 10);
    if (isNaN(qty) || qty < 0) {
      alert("Quantidade inválida.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateSlotMedicationQuantity(slot.id, medicationId, qty);
      setEditingQtyMedId(null);
      await onDispenserChange();
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar quantidade.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMedication = async (medicationId: string) => {
    setIsSubmitting(true);
    try {
      await removeSlotMedication(slot.id, medicationId);
      await onDispenserChange();
    } catch (err) {
      console.error(err);
      alert("Erro ao remover medicamento.");
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
        maxWidth: "600px",
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
              Gerencie os medicamentos e as quantidades físicas armazenadas neste slot.
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

        {/* Current Medications List */}
        <div style={{ marginTop: "var(--space-6)" }}>
          <h4 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-base)", color: "var(--ink)" }}>
            Medicamentos no Slot
          </h4>
          
          {slotMedications.length === 0 ? (
            <div style={{
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-5)",
              color: "var(--ink-2)",
              textAlign: "center",
              marginBottom: "var(--space-4)",
            }}>
              Nenhum medicamento configurado neste slot.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
              {slotMedications.map((item: any) => (
                <div
                  key={item.medication.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-4)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "var(--space-3)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                      {item.medication.name}
                    </div>
                    {editingQtyMedId === item.medication.id ? (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
                        <input
                          type="number"
                          value={editingQtyValue}
                          onChange={(e) => setEditingQtyValue(e.target.value)}
                          min="0"
                          style={{
                            width: "80px",
                            padding: "6px 8px",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border)",
                            fontSize: "var(--text-sm)"
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => saveInlineQuantity(item.medication.id)}
                          disabled={isSubmitting}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "var(--radius-md)",
                            background: "var(--primary)",
                            color: "var(--primary-on)",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "var(--text-sm)",
                            fontWeight: 600
                          }}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingQtyMedId(null)}
                          disabled={isSubmitting}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "var(--radius-md)",
                            background: "transparent",
                            color: "var(--ink-2)",
                            border: "1px solid var(--border)",
                            cursor: "pointer",
                            fontSize: "var(--text-sm)"
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
                        Quantidade: {item.quantity} unidades
                      </div>
                    )}
                  </div>

                  {editingQtyMedId !== item.medication.id && (
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQtyMedId(item.medication.id);
                          setEditingQtyValue(String(item.quantity));
                        }}
                        disabled={isSubmitting}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          cursor: "pointer",
                        }}
                      >
                        Editar Qtd
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(item.medication.id)}
                        disabled={isSubmitting}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          background: "rgba(239, 68, 68, 0.08)",
                          color: "var(--danger, #ef4444)",
                          cursor: "pointer",
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "var(--space-6) 0" }} />

        {/* Add Medication Form */}
        <div>
          <h4 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-base)", color: "var(--ink)" }}>
            Adicionar ao Slot
          </h4>
          
          {isLoading ? (
            <div style={{ textAlign: "center", color: "var(--ink-3)" }}>Carregando catálogo...</div>
          ) : (
            <form onSubmit={handleAddMedication} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>
                  Selecione do Catálogo
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {medicationsCatalog.map((medication) => (
                    <button
                      key={medication.id}
                      type="button"
                      onClick={() => {
                        setSelectedMedicationId(medication.id);
                        setNewMedicationName("");
                        setNewMedicationDosage("");
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
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>Novo (Nome)</label>
                  <input
                    type="text"
                    value={newMedicationName}
                    onChange={(e) => {
                      setNewMedicationName(e.target.value);
                      if (selectedMedicationId) setSelectedMedicationId("");
                    }}
                    placeholder="Ex.: Ritalina"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-sm)", fontWeight: 600 }}>Quantidade</label>
                  <input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    min="1"
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || (!activeMedicationId && !newMedicationName.trim())}
                style={{
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "var(--primary)",
                  color: "var(--primary-on)",
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: "var(--space-2)",
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? "Adicionando..." : "Adicionar Remédio ao Slot"}
              </button>
            </form>
          )}
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
