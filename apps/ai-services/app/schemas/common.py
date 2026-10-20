from pydantic import BaseModel, Field
from typing import Optional, Tuple


class GeoCoordinates(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")


class LocationSpec(BaseModel):
    address: Optional[str] = None
    city: str = Field(default="Pune", description="Operational cluster/city name")
    pincode: str = Field(..., pattern=r"^\d{6}$", description="6-digit Indian PIN code")
    cluster: str = Field(default="Pune", description="Micro-cluster identifier")
    coordinates: Optional[GeoCoordinates] = None


class DistanceEstimate(BaseModel):
    distance_km: float
    estimated_transit_minutes: int
    calculation_method: str = "deterministic_haversine"
    is_estimated: bool = True
    notice: str = "Estimated urban road travel time based on 25 km/h metro average."
