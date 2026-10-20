from typing import List, Optional
from ..schemas.providers import (
    ProviderCandidate,
    MatchingRequest,
    RankedProvider,
    MatchingResponse,
)
from .routing_service import deterministic_router


def rank_provider_candidates(request: MatchingRequest) -> MatchingResponse:
    candidates = request.candidate_providers
    patient_loc = request.patient_location
    bundle = request.target_bundle
    single_task = request.single_task

    target_id = bundle.bundle_id if bundle else (single_task.task_id if single_task else "target_dispatch")
    
    # Determine required profession types
    if bundle:
        eligible_professions = [p.lower() for p in bundle.eligible_profession_types]
        equipment_needed = set(bundle.shared_equipment)
    elif single_task:
        eligible_professions = [single_task.required_profession_type.lower()]
        equipment_needed = set(single_task.equipment_needed)
    else:
        eligible_professions = []
        equipment_needed = set()

    ranked_list: List[RankedProvider] = []

    for cand in candidates:
        reasons: List[str] = []
        score_breakdown: dict = {}
        cand_prof = cand.profession_type.lower()

        # -------------------------------------------------------------
        # 1. STRICT REGULATORY CHECK: Verified Credential Requirement
        # -------------------------------------------------------------
        if cand.verification_status.lower() != "verified":
            ranked_list.append(
                RankedProvider(
                    provider_id=cand.provider_id,
                    full_name=cand.full_name,
                    title=cand.title,
                    profession_type=cand.profession_type,
                    registration_number=cand.registration_number,
                    verification_status=cand.verification_status,
                    match_score=0.0,
                    is_eligible=False,
                    reasons=[
                        f"Ineligible: Credential verification status is '{cand.verification_status}'. "
                        "Clinicians must have verified registration council credentials prior to dispatch."
                    ],
                    score_breakdown={"credentials": 0.0},
                )
            )
            continue

        # -------------------------------------------------------------
        # 2. Skill & Professional Specialty Fit (Max 40 pts)
        # -------------------------------------------------------------
        skill_score = 0.0
        if cand_prof in eligible_professions:
            skill_score = 40.0
            reasons.append(f"Direct profession match: Licensed {cand.profession_type.upper()}")
        elif cand_prof == "nurse" and any(p in ["phlebotomist", "chw"] for p in eligible_professions):
            # Registered nurse cross-qualification
            skill_score = 38.0
            reasons.append(f"Cross-qualified clinician: Licensed Nurse qualified for {', '.join(eligible_professions)}")
        else:
            # Incompatible profession
            ranked_list.append(
                RankedProvider(
                    provider_id=cand.provider_id,
                    full_name=cand.full_name,
                    title=cand.title,
                    profession_type=cand.profession_type,
                    registration_number=cand.registration_number,
                    verification_status=cand.verification_status,
                    match_score=0.0,
                    is_eligible=False,
                    reasons=[
                        f"Ineligible: Profession '{cand.profession_type}' does not match requirement [{', '.join(eligible_professions)}]."
                    ],
                    score_breakdown={"skills": 0.0},
                )
            )
            continue

        score_breakdown["skills"] = skill_score

        # -------------------------------------------------------------
        # 3. Service Cluster & Coverage (Max 25 pts)
        # -------------------------------------------------------------
        cluster_score = 0.0
        patient_city = patient_loc.city.lower()
        patient_cluster = patient_loc.cluster.lower()

        matched_cluster = any(
            c.lower() in [patient_city, patient_cluster, "all"] for c in cand.service_clusters
        )

        if matched_cluster:
            cluster_score = 25.0
            reasons.append(f"Active in target service cluster: {patient_loc.cluster}")
        else:
            cluster_score = 10.0
            reasons.append(f"Regional coverage outside primary cluster: {', '.join(cand.service_clusters)}")

        score_breakdown["cluster"] = cluster_score

        # -------------------------------------------------------------
        # 4. Proximity & Travel Estimate (Max 20 pts)
        # -------------------------------------------------------------
        distance_score = 12.0
        dist_km: Optional[float] = None
        travel_mins: Optional[int] = None

        if cand.current_location and patient_loc.coordinates:
            estimate = deterministic_router.estimate_travel(
                cand.current_location, patient_loc.coordinates
            )
            dist_km = estimate.distance_km
            travel_mins = estimate.estimated_transit_minutes

            if dist_km <= 5.0:
                distance_score = 20.0
                reasons.append(f"Close proximity: {dist_km} km (~{travel_mins} mins travel)")
            elif dist_km <= 12.0:
                distance_score = 15.0
                reasons.append(f"Moderate distance: {dist_km} km (~{travel_mins} mins travel)")
            elif dist_km <= 20.0:
                distance_score = 10.0
                reasons.append(f"Extended cluster distance: {dist_km} km (~{travel_mins} mins travel)")
            else:
                distance_score = 5.0
                reasons.append(f"Substantial travel required: {dist_km} km (~{travel_mins} mins travel)")
        else:
            reasons.append("Location estimate based on postal pincode cluster (GPS coordinates not provided)")

        score_breakdown["proximity"] = distance_score

        # -------------------------------------------------------------
        # 5. Rating & Experience (Max 10 pts)
        # -------------------------------------------------------------
        rating_score = (cand.rating / 5.0) * 6.0
        exp_score = min(cand.years_of_experience * 0.8, 4.0)
        reputation_score = round(rating_score + exp_score, 1)

        score_breakdown["reputation"] = reputation_score
        reasons.append(f"Clinical record: {cand.rating}★ rating with {cand.years_of_experience} yrs experience")

        # -------------------------------------------------------------
        # 6. Equipment & Logistics Readiness (Max 5 pts)
        # -------------------------------------------------------------
        equip_score = 0.0
        cand_equipment = set(cand.carries_equipment)
        if equipment_needed:
            has_all_equip = equipment_needed.issubset(cand_equipment)
            if has_all_equip:
                equip_score = 5.0
                reasons.append(f"Equipped with all necessary supplies ({', '.join(equipment_needed)})")
            elif any(e in cand_equipment for e in equipment_needed):
                equip_score = 3.0
                reasons.append("Partially equipped with required medical kit")
            else:
                equip_score = 1.0
                reasons.append(f"Requires depot supply pickup for: {', '.join(equipment_needed)}")
        else:
            equip_score = 5.0
            reasons.append("No specialized durable equipment needed for visit")

        score_breakdown["equipment"] = equip_score

        # Total Match Score
        total_score = round(
            skill_score + cluster_score + distance_score + reputation_score + equip_score, 1
        )
        total_score = min(total_score, 100.0)

        ranked_list.append(
            RankedProvider(
                provider_id=cand.provider_id,
                full_name=cand.full_name,
                title=cand.title,
                profession_type=cand.profession_type,
                registration_number=cand.registration_number,
                verification_status=cand.verification_status,
                match_score=total_score,
                is_eligible=True,
                estimated_distance_km=dist_km,
                estimated_travel_minutes=travel_mins,
                reasons=reasons,
                score_breakdown=score_breakdown,
            )
        )

    # Sort descending by match score
    ranked_list.sort(key=lambda x: (1 if x.is_eligible else 0, x.match_score), reverse=True)
    eligible_count = sum(1 for r in ranked_list if r.is_eligible)

    return MatchingResponse(
        target_identifier=target_id,
        total_evaluated=len(candidates),
        total_eligible=eligible_count,
        ranked_providers=ranked_list,
        requires_human_approval=True,
    )
