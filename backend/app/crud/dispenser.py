import datetime
from typing import List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.domain import (
    DispensationLog,
    Dispenser,
    Drawer,
    RefillHistory,
    Schedule,
    Slot,
    SlotMedication,
)
from app.schemas.dispenser import (
    DispenserDeletionBlockers,
    DispenserDeletionStatus,
    DispenserResetConfigurationResult,
)
from app.services.dispenser_online import refresh_dispenser_online_state


def get_dispenser_status(db: Session, hardware_id: str) -> dict:
    """Get the telemetry status for a dispenser."""
    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == hardware_id).first()
    if not dispenser:
        return {
            "dispenser_id": hardware_id,
            "online": False,
            "critical_stock": False,
            "ip_address": None
        }
        
    is_online = refresh_dispenser_online_state(db, dispenser, persist=True)

    return {
        "dispenser_id": dispenser.hardware_id,
        "online": is_online,
        "critical_stock": dispenser.critical_stock,
        "ip_address": dispenser.ip_address
    }


def update_dispenser_status(db: Session, hardware_id: str, status: dict) -> dict:
    """Update dispenser telemetry status."""
    dispenser = db.query(Dispenser).filter(Dispenser.hardware_id == hardware_id).first()
    now = datetime.datetime.utcnow()
    
    if not dispenser:
        dispenser = Dispenser(
            hardware_id=hardware_id,
            is_online=status.get("online", True),
            critical_stock=status.get("critical_stock", False),
            ip_address=status.get("ip_address"),
            last_sync=now
        )
        db.add(dispenser)
    else:
        dispenser.is_online = status.get("online", dispenser.is_online)
        dispenser.critical_stock = status.get("critical_stock", dispenser.critical_stock)
        if "ip_address" in status and status["ip_address"]:
            dispenser.ip_address = status["ip_address"]
        dispenser.last_sync = now
        
    db.commit()
    db.refresh(dispenser)
    return status


def _slot_ids_for_dispenser(db: Session, dispenser: Dispenser) -> List[int]:
    drawer_ids = [
        row[0]
        for row in db.query(Drawer.id).filter(Drawer.dispenser_id == dispenser.id).all()
    ]
    if not drawer_ids:
        return []
    return [
        row[0]
        for row in db.query(Slot.id).filter(Slot.drawer_id.in_(drawer_ids)).all()
    ]


def _count_deletion_blockers(db: Session, dispenser: Dispenser) -> DispenserDeletionBlockers:
    slot_ids = _slot_ids_for_dispenser(db, dispenser)

    medications_count = 0
    schedules_in_slots = 0
    if slot_ids:
        medications_count = (
            db.query(SlotMedication)
            .filter(SlotMedication.slot_id.in_(slot_ids))
            .count()
        )
        schedules_in_slots = (
            db.query(Schedule)
            .filter(Schedule.slot_id.in_(slot_ids))
            .count()
        )

    schedules_by_hardware = (
        db.query(Schedule)
        .filter(Schedule.dispenser_id == dispenser.hardware_id)
        .count()
    )

    return DispenserDeletionBlockers(
        medications_in_slots=medications_count,
        schedules=schedules_in_slots + schedules_by_hardware,
    )


def _build_deletion_steps(blockers: DispenserDeletionBlockers) -> List[str]:
    steps: List[str] = []
    if blockers.medications_in_slots > 0:
        steps.append(
            "No painel (Dashboard), abra cada compartimento e remova todos os medicamentos."
        )
    if blockers.schedules > 0:
        steps.append(
            "Exclua os horários de medicação vinculados a este dispensador na aba de horários."
        )
    if steps:
        steps.append(
            'Ou use o botão "Preparar para remoção" abaixo para limpar medicamentos e horários automaticamente.'
        )
        steps.append("Depois disso, confirme a remoção do dispensador nesta tela.")
    return steps


def get_deletion_status(db: Session, dispenser: Dispenser) -> DispenserDeletionStatus:
    blockers = _count_deletion_blockers(db, dispenser)
    can_delete = blockers.medications_in_slots == 0 and blockers.schedules == 0

    if can_delete:
        message = "O dispensador pode ser removido. A estrutura de compartimentos será apagada junto com o registro."
        steps = []
    else:
        parts = []
        if blockers.medications_in_slots > 0:
            parts.append(
                f"{blockers.medications_in_slots} medicamento(s) ainda em compartimentos"
            )
        if blockers.schedules > 0:
            parts.append(f"{blockers.schedules} horário(s) de medicação ativos")
        message = (
            "Não é possível remover o dispensador: "
            + "; ".join(parts)
            + ". Limpe a configuração antes de remover."
        )
        steps = _build_deletion_steps(blockers)

    return DispenserDeletionStatus(
        can_delete=can_delete,
        blockers=blockers,
        message=message,
        steps=steps,
    )


def assert_dispenser_deletable(db: Session, dispenser: Dispenser) -> None:
    status = get_deletion_status(db, dispenser)
    if status.can_delete:
        return

    raise HTTPException(
        status_code=409,
        detail={
            "code": "DISPENSER_HAS_CONFIGURATION",
            "message": status.message,
            "blockers": status.blockers.model_dump(),
            "steps": status.steps,
        },
    )


def reset_dispenser_configuration(
    db: Session, dispenser: Dispenser
) -> DispenserResetConfigurationResult:
    """Remove medications and schedules so the dispenser can be deleted."""
    slot_ids = _slot_ids_for_dispenser(db, dispenser)

    removed_medications = 0
    removed_schedules = 0

    if slot_ids:
        removed_medications = (
            db.query(SlotMedication)
            .filter(SlotMedication.slot_id.in_(slot_ids))
            .delete(synchronize_session=False)
        )
        removed_schedules += (
            db.query(Schedule)
            .filter(Schedule.slot_id.in_(slot_ids))
            .delete(synchronize_session=False)
        )

    removed_schedules += (
        db.query(Schedule)
        .filter(Schedule.dispenser_id == dispenser.hardware_id)
        .delete(synchronize_session=False)
    )

    db.commit()

    return DispenserResetConfigurationResult(
        removed_medications=removed_medications,
        removed_schedules=removed_schedules,
        message=(
            "Configuração removida. Agora você pode excluir o dispensador; "
            "compartimentos vazios e histórico vinculado aos slots serão apagados na remoção."
        ),
    )


def delete_dispenser(db: Session, dispenser: Dispenser) -> None:
    """Remove dispenser hardware record and structural drawers/slots (after configuration is cleared)."""
    drawer_ids = [
        row[0]
        for row in db.query(Drawer.id).filter(Drawer.dispenser_id == dispenser.id).all()
    ]

    if drawer_ids:
        slot_ids = [
            row[0]
            for row in db.query(Slot.id).filter(Slot.drawer_id.in_(drawer_ids)).all()
        ]
        if slot_ids:
            db.query(DispensationLog).filter(DispensationLog.slot_id.in_(slot_ids)).delete(
                synchronize_session=False
            )
            db.query(RefillHistory).filter(RefillHistory.slot_id.in_(slot_ids)).delete(
                synchronize_session=False
            )
            db.query(SlotMedication).filter(SlotMedication.slot_id.in_(slot_ids)).delete(
                synchronize_session=False
            )
            db.query(Schedule).filter(Schedule.slot_id.in_(slot_ids)).delete(
                synchronize_session=False
            )
            db.query(Slot).filter(Slot.id.in_(slot_ids)).delete(synchronize_session=False)

        db.query(Drawer).filter(Drawer.dispenser_id == dispenser.id).delete(
            synchronize_session=False
        )

    db.query(Schedule).filter(Schedule.dispenser_id == dispenser.hardware_id).delete(
        synchronize_session=False
    )
    db.delete(dispenser)
