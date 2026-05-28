from sqlalchemy import Column, String, Boolean, Date, ForeignKey, Table, Integer, Numeric, Time, DateTime, BigInteger, Uuid as UUID
from sqlalchemy.orm import relationship
import uuid
import datetime

from app.core.database import Base

patient_caregiver = Table(
    'patient_caregiver',
    Base.metadata,
    Column('patient_id', UUID(as_uuid=True), ForeignKey('patients.id'), primary_key=True),
    Column('caregiver_id', UUID(as_uuid=True), ForeignKey('caregivers.id'), primary_key=True),
    Column('relationship_tag', String)
)

class User(Base):
    """User model - authenticates as a caregiver."""
    __tablename__ = 'caregivers'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    tax_id = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True)
    notifications_enabled = Column(Boolean, default=True)


class Patient(Base):
    __tablename__ = 'patients'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tax_id = Column(String, unique=True, nullable=True) # made nullable for retro-compatibility
    full_name = Column(String, nullable=False)
    birth_date = Column(Date)
    phone = Column(String)
    email = Column(String)
    
    # Fields from legacy schema
    name = Column(String)
    age = Column(Integer)
    condition = Column(String)
    caregiver_username = Column(String) # Simple link to User.username for now

    caregivers = relationship('User', secondary=patient_caregiver, back_populates='patients')
    dispensers = relationship('Dispenser', back_populates='patient')

class Dispenser(Base):
    __tablename__ = 'dispensers'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hardware_id = Column(String, unique=True, nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id'), nullable=True) # made nullable
    is_online = Column(Boolean, default=False)
    last_sync = Column(DateTime)
    
    # Telemetry fields
    battery_level = Column(Numeric, default=100.0)
    critical_stock = Column(Boolean, default=False)

    patient = relationship('Patient', back_populates='dispensers')
    drawers = relationship('Drawer', back_populates='dispenser')

class Drawer(Base):
    __tablename__ = 'drawers'

    id = Column(Integer, primary_key=True, autoincrement=True)
    dispenser_id = Column(UUID(as_uuid=True), ForeignKey('dispensers.id'), nullable=False)
    label = Column(String)

    dispenser = relationship('Dispenser', back_populates='drawers')
    slots = relationship('Slot', back_populates='drawer')

class Slot(Base):
    __tablename__ = 'slots'

    id = Column(Integer, primary_key=True, autoincrement=True)
    drawer_id = Column(Integer, ForeignKey('drawers.id'), nullable=False)
    position_number = Column(Integer, nullable=False)
    max_pill_capacity = Column(Integer, nullable=False)

    drawer = relationship('Drawer', back_populates='slots')
    slot_medications = relationship('SlotMedication', cascade="all, delete-orphan", back_populates='slot')
    schedules = relationship('Schedule', back_populates='slot')

class SlotMedication(Base):
    __tablename__ = 'slot_medications'

    slot_id = Column(Integer, ForeignKey('slots.id', ondelete='CASCADE'), primary_key=True)
    medication_id = Column(Integer, ForeignKey('medications.id'), primary_key=True)
    quantity = Column(Integer, default=0)

    slot = relationship('Slot', back_populates='slot_medications')
    medication = relationship('Medication')

class Medication(Base):
    __tablename__ = 'medications'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    dosage = Column(String) # Renamed from dosage_mg to match API string format
    description = Column(String)

class Schedule(Base):
    __tablename__ = 'schedules'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slot_id = Column(Integer, ForeignKey('slots.id'), nullable=True) 
    scheduled_time = Column(Time, nullable=True)
    is_active = Column(Boolean, default=True)

    # Legacy fields
    patient_id = Column(UUID(as_uuid=True), nullable=True)
    dispenser_id = Column(String, nullable=True)
    time_legacy = Column(String, nullable=True)

    slot = relationship('Slot', back_populates='schedules', foreign_keys=[slot_id])

class PatientMedication(Base):
    __tablename__ = 'patient_medications'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id'), nullable=False)
    nome = Column(String, nullable=False)
    dosagem = Column(String, nullable=False)
    frequencia = Column(String, nullable=False)
    horarios = Column(String, nullable=False)  # JSON array stored as text
    observacoes = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship('Patient')


class DispensationLog(Base):
    __tablename__ = 'dispensation_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    slot_id = Column(Integer, ForeignKey('slots.id'), nullable=True) # made nullable
    medication_name_snapshot = Column(String)
    pills_dispensed = Column(Integer)
    scheduled_time_reference = Column(DateTime, nullable=True) # made nullable
    actual_execution_time = Column(DateTime)
    status = Column(String)
    caregiver_notified = Column(Boolean, default=False)
    
    # Legacy fields
    schedule_id_legacy = Column(String, nullable=True)
    patient_id_legacy = Column(String, nullable=True)
    dispenser_id_legacy = Column(String, nullable=True)
    medication_id_legacy = Column(String, nullable=True)
    success = Column(Boolean, nullable=True)
    error_message = Column(String, nullable=True)

    slot = relationship('Slot')

class RefillHistory(Base):
    __tablename__ = 'refill_history'

    id = Column(Integer, primary_key=True, autoincrement=True)
    slot_id = Column(Integer, ForeignKey('slots.id'), nullable=True) # made nullable
    caregiver_id = Column(UUID(as_uuid=True), ForeignKey('caregivers.id'), nullable=True) # made nullable
    quantity_added = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Legacy fields
    dispenser_id_legacy = Column(String, nullable=True)
    medication_id_legacy = Column(String, nullable=True)
    performed_by_legacy = Column(String, nullable=True)

    slot = relationship('Slot')
    caregiver = relationship('User')


# Backwards compatibility alias
Caregiver = User
