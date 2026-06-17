#!/usr/bin/env python
"""
Seed script: cria o paciente 'professor' para a demo da apresentação.
Cria (ou atualiza) o caregiver com email felippe.veloso15@gmail.com,
vincula ao dispenser físico e adiciona os medicamentos da roleta.

Usa SQL direto para evitar conflito de schema entre modelos e BD local.

Uso: python3 seed_presentation.py
"""
import sys
import uuid
from pathlib import Path

current_dir = Path(__file__).resolve().parent
sys.path.append(str(current_dir))

from dotenv import load_dotenv
load_dotenv(current_dir / ".env")

from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.domain import (
    User, Patient, Dispenser, Drawer, Slot,
    Medication, SlotMedication, Schedule
)

HARDWARE_ID = "C0:CD:D6:CE:4A:AC"
CAREGIVER_USERNAME = "felippe@pillar.br"
CAREGIVER_EMAIL = "felippe.veloso15@gmail.com"

MEDICATIONS = [
    "Amor", "Carinho", "Paciência", "Sabedoria",
    "Alegria", "Saúde", "Paz", "Inspiração",
    "Gratidão", "Humor", "Coragem", "Coisas Boas",
]


def seed(db: Session):
    print("=== Seed de Apresentação ===")

    # 1. Caregiver
    caregiver_record = db.execute(
        text("SELECT id, email, notifications_enabled FROM caregivers WHERE username = :u"),
        {"u": CAREGIVER_USERNAME}
    ).fetchone()
    
    if not caregiver_record:
        new_id = str(uuid.uuid4())
        hashed = get_password_hash("123Seguro&")
        db.execute(
            text("""
            INSERT INTO caregivers (id, username, email, full_name, tax_id, hashed_password, notifications_enabled)
            VALUES (:id, :u, :e, :n, :t, :h, true)
            """),
            {"id": new_id, "u": CAREGIVER_USERNAME, "e": CAREGIVER_EMAIL, "n": "Felippe Veloso", "t": "000.000.000-02", "h": hashed}
        )
        db.commit()
        print(f"[+] Caregiver criado: {CAREGIVER_USERNAME}")
    else:
        db.execute(
            text("UPDATE caregivers SET email = :e, notifications_enabled = true WHERE username = :u"),
            {"e": CAREGIVER_EMAIL, "u": CAREGIVER_USERNAME}
        )
        db.commit()
        print(f"[-] Caregiver já existe: {CAREGIVER_USERNAME} — e-mail/notificações atualizados")

    # 2. Paciente professor
    patient = db.query(Patient).filter(
        Patient.caregiver_username == CAREGIVER_USERNAME,
        Patient.full_name == "Prof. João"
    ).first()
    if not patient:
        patient = Patient(
            full_name="Prof. João",
            name="Prof. João",
            age=52,
            condition="Merecedor de coisas boas",
            caregiver_username=CAREGIVER_USERNAME,
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        print(f"[+] Paciente criado: {patient.full_name} (ID: {patient.id})")
    else:
        print(f"[-] Paciente já existe: {patient.full_name} (ID: {patient.id})")

    # 3. Dispenser — cria ou associa ao paciente
    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == HARDWARE_ID).first()
    if not dispenser:
        dispenser = Dispenser(hardware_id=HARDWARE_ID, patient_id=patient.id)
        db.add(dispenser)
        db.commit()
        db.refresh(dispenser)
        print(f"[+] Dispenser criado e pareado: {HARDWARE_ID}")
    else:
        if str(dispenser.patient_id) != str(patient.id):
            dispenser.patient_id = patient.id
            db.commit()
            print(f"[~] Dispenser {HARDWARE_ID} re-pareado ao paciente {patient.full_name}")
        else:
            print(f"[-] Dispenser {HARDWARE_ID} já estava pareado ao paciente")

    # 4. Gaveta e slots
    drawer = db.query(Drawer).filter(Drawer.dispenser_id == dispenser.id).first()
    if not drawer:
        drawer = Drawer(dispenser_id=dispenser.id, label="Principal")
        db.add(drawer)
        db.commit()
        db.refresh(drawer)
        for i in range(1, 32):
            db.add(Slot(drawer_id=drawer.id, position_number=i, max_pill_capacity=30))
        db.commit()
        print(f"[+] Gaveta + 31 slots criados")
    else:
        print(f"[-] Gaveta já existe (ID: {drawer.id})")

    slots = db.query(Slot).filter(Slot.drawer_id == drawer.id).order_by(Slot.position_number).all()

    # 5. Medicamentos e associação aos slots
    for idx, med_name in enumerate(MEDICATIONS):
        slot = slots[idx] if idx < len(slots) else None
        if not slot:
            continue

        # Cria medicamento se não existir
        med = db.query(Medication).filter(Medication.name == med_name).first()
        if not med:
            med = Medication(name=med_name, dosage="1 unidade", description="Prescrito com amor")
            db.add(med)
            db.commit()
            db.refresh(med)
            print(f"[+] Medicamento criado: {med_name}")
        else:
            print(f"[-] Medicamento já existe: {med_name}")

        # Associa ao slot se ainda não estiver
        sm = db.query(SlotMedication).filter(
            SlotMedication.slot_id == slot.id,
            SlotMedication.medication_id == med.id
        ).first()
        if not sm:
            db.add(SlotMedication(slot_id=slot.id, medication_id=med.id, quantity=30))
            db.commit()
            print(f"[+] {med_name} → Slot #{slot.position_number}")

    print("\n=== Seed concluído! ===")
    print(f"  Caregiver: {CAREGIVER_USERNAME} / 123Seguro&")
    print(f"  Email notificações: {CAREGIVER_EMAIL}")
    print(f"  Paciente: Prof. João")
    print(f"  Dispenser: {HARDWARE_ID}")
    print(f"  {len(MEDICATIONS)} medicamentos nos primeiros slots\n")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
