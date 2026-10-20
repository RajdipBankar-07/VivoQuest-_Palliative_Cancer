import uuid
from typing import List, Dict, Set
from ..schemas.tasks import (
    ClinicalTask,
    BundlingEvaluationRequest,
    BundleItem,
    BundlingEvaluationResponse,
)

# Cross-qualification compatibility mapping
# Which professions are licensed to execute which task requirements in India home healthcare
PROFESSION_SKILL_MATRIX: Dict[str, Set[str]] = {
    "nurse": {
        "phlebotomist",
        "nurse",
        "chw",
        "vitals_check",
        "phlebotomy",
        "preventive",
        "sdoh_fall_risk_audit",
    },
    "phlebotomist": {
        "phlebotomist",
        "phlebotomy",
    },
    "physiotherapist": {
        "physiotherapist",
        "physiotherapy",
        "sdoh_fall_risk_audit",
    },
    "chw": {
        "chw",
        "preventive",
        "sdoh_fall_risk_audit",
        "vitals_check",
        "equipment_dropoff",
    },
    "dietitian": {
        "dietitian",
        "nutrition_counseling",
        "therapy",
    },
    "physician": {
        "physician",
        "teleconsultation",
        "physician_exam",
        "vitals_check",
    },
    "technician": {
        "technician",
        "equipment",
        "dme_setup",
    },
}

# Incompatible procedures matrix (cannot be performed simultaneously on same visit)
CLINICAL_CONTRAINDICATIONS = [
    {
        "pair": {"physiotherapy", "urgent_fasting_phlebotomy"},
        "reason": "Strenuous physical therapy should not be conducted while patient is in an overnight fasting state before blood draw.",
    },
]


def evaluate_clinical_bundles(
    request: BundlingEvaluationRequest,
) -> BundlingEvaluationResponse:
    tasks = request.tasks
    if not tasks:
        return BundlingEvaluationResponse(
            is_bundling_recommended=False,
            suggested_bundles=[],
            unbundled_tasks=[],
            total_efficiency_gain_minutes=0,
        )

    # Group tasks by patient_id and cluster
    patient_groups: Dict[str, List[ClinicalTask]] = {}
    for task in tasks:
        key = f"{task.patient_id}_{task.location.city}_{task.location.pincode}"
        patient_groups.setdefault(key, []).append(task)

    suggested_bundles: List[BundleItem] = []
    unbundled_tasks: List[ClinicalTask] = []
    total_minutes_saved = 0

    for key, p_tasks in patient_groups.items():
        if len(p_tasks) == 1:
            # Single task, no bundling needed
            unbundled_tasks.append(p_tasks[0])
            continue

        # Check total duration
        total_duration = sum(t.estimated_duration_minutes for t in p_tasks)
        if total_duration > request.max_total_minutes:
            # If total duration exceeds max threshold (e.g. 120 mins), partition to avoid patient exhaustion
            # Keep highest priority tasks in bundle 1, rest unbundled
            sorted_tasks = sorted(
                p_tasks,
                key=lambda t: (0 if t.requires_fasting else 1, t.estimated_duration_minutes),
            )
            bundle_tasks: List[ClinicalTask] = []
            curr_time = 0
            for t in sorted_tasks:
                if curr_time + t.estimated_duration_minutes <= request.max_total_minutes:
                    bundle_tasks.append(t)
                    curr_time += t.estimated_duration_minutes
                else:
                    unbundled_tasks.append(t)
            p_tasks = bundle_tasks

        if len(p_tasks) <= 1:
            unbundled_tasks.extend(p_tasks)
            continue

        # Check for single-provider skill intersection
        required_types = [t.required_profession_type.lower() for t in p_tasks]
        eligible_single_professions: List[str] = []

        for prof, skills in PROFESSION_SKILL_MATRIX.items():
            if all(req in skills for req in required_types):
                eligible_single_professions.append(prof)

        # Collect equipment requirements
        all_equipment = list(
            set(eq for t in p_tasks for eq in t.equipment_needed if eq)
        )

        # Generate clinical safeguards and rules
        safeguards: List[str] = []
        matching_criteria: List[str] = []

        has_fasting = any(t.requires_fasting for t in p_tasks)
        if has_fasting:
            safeguards.append(
                "Fasting Protocol: Blood collection must be completed first in the morning (07:00-09:30 AM) prior to meal intake or subsequent assessments."
            )
            matching_criteria.append("Morning time-slot alignment required")

        # Check contraindications
        task_codes = set(t.service_code.lower() for t in p_tasks)
        for rule in CLINICAL_CONTRAINDICATIONS:
            if rule["pair"].issubset(task_codes):
                safeguards.append(f"Caution: {rule['reason']}")

        # Efficiency calculation: Bundling saves patient 30 mins coordination + provider travel duplication
        efficiency_savings = (len(p_tasks) - 1) * 35
        total_minutes_saved += efficiency_savings

        bundle_type = (
            "single_provider_visit"
            if eligible_single_professions
            else "multidisciplinary_coordinated_window"
        )

        matching_criteria.append(
            f"Geographic proximity: Same household (PIN: {p_tasks[0].location.pincode})"
        )
        if eligible_single_professions:
            matching_criteria.append(
                f"Cross-qualified single clinician: {', '.join(eligible_single_professions).upper()}"
            )
        else:
            matching_criteria.append(
                "Sequential back-to-back arrival in synchronized 2-hour window"
            )

        bundle_item = BundleItem(
            bundle_id=f"bundle_{uuid.uuid4().hex[:8]}",
            title=f"Coordinated Super-Visit ({len(p_tasks)} Care Services)",
            bundle_type=bundle_type,
            task_ids=[t.task_id for t in p_tasks],
            tasks=p_tasks,
            total_duration_minutes=sum(t.estimated_duration_minutes for t in p_tasks),
            eligible_profession_types=(
                eligible_single_professions if eligible_single_professions else required_types
            ),
            shared_equipment=all_equipment,
            compatibility_score=0.92 if eligible_single_professions else 0.84,
            matching_criteria=matching_criteria,
            clinical_safeguards=safeguards,
        )
        suggested_bundles.append(bundle_item)

    return BundlingEvaluationResponse(
        is_bundling_recommended=len(suggested_bundles) > 0,
        suggested_bundles=suggested_bundles,
        unbundled_tasks=unbundled_tasks,
        total_efficiency_gain_minutes=total_minutes_saved,
    )
