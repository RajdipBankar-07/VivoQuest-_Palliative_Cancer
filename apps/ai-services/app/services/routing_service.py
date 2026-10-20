import math
from typing import Optional, List
from ..schemas.common import GeoCoordinates, DistanceEstimate
from ..config import settings


def haversine_distance_km(coord1: GeoCoordinates, coord2: GeoCoordinates) -> float:
    """Calculate the great-circle distance between two points on the Earth in kilometers."""
    R = 6371.0  # Earth's radius in kilometers

    lat1_rad = math.radians(coord1.lat)
    lng1_rad = math.radians(coord1.lng)
    lat2_rad = math.radians(coord2.lat)
    lng2_rad = math.radians(coord2.lng)

    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad

    a = math.sin(dlat / 2.0) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return R * c


class RouteOptimizerInterface:
    """Interface for routing engines (deterministic fallback, Google Maps, Mapbox, or OR-Tools)."""

    def estimate_travel(
        self, origin: GeoCoordinates, destination: GeoCoordinates
    ) -> DistanceEstimate:
        raise NotImplementedError


class DeterministicDistanceEstimator(RouteOptimizerInterface):
    """Deterministic routing provider using Haversine distance with urban grid winding factor."""

    def __init__(self, urban_speed_kmh: float = 25.0, winding_factor: float = 1.35):
        self.urban_speed_kmh = urban_speed_kmh
        self.winding_factor = winding_factor

    def estimate_travel(
        self, origin: GeoCoordinates, destination: GeoCoordinates
    ) -> DistanceEstimate:
        crow_distance = haversine_distance_km(origin, destination)
        road_distance_km = round(crow_distance * self.winding_factor, 2)

        # Estimated driving time in minutes at urban speed + 5 min access buffer
        driving_hours = road_distance_km / self.urban_speed_kmh
        transit_minutes = int(round(driving_hours * 60.0)) + 5

        return DistanceEstimate(
            distance_km=road_distance_km,
            estimated_transit_minutes=transit_minutes,
            calculation_method="deterministic_haversine",
            is_estimated=True,
            notice=(
                f"Estimated road distance with {self.winding_factor}x urban detour factor "
                f"at {self.urban_speed_kmh} km/h metro speed. Real-time traffic requires live Mapbox/Google API."
            ),
        )


deterministic_router = DeterministicDistanceEstimator(
    urban_speed_kmh=settings.AVERAGE_URBAN_SPEED_KMH
)
