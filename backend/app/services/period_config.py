"""Default period times and helpers."""

from app.core import config

VALID_PERIODS = ("morning", "afternoon", "night")

PERIOD_LABELS = {
    "morning": "Manhã",
    "afternoon": "Tarde",
    "night": "Noite",
}


def default_period_times() -> dict[str, str]:
    return {
        "morning": config.DISPENSE_PERIOD_MORNING,
        "afternoon": config.DISPENSE_PERIOD_AFTERNOON,
        "night": config.DISPENSE_PERIOD_NIGHT,
    }
