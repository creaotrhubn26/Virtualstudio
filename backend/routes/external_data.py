"""
External Data Routes - Kartverket Address and Property Analysis
Provides mock data for property analysis until real Kartverket API integration is implemented.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import hashlib
import random
import math
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/external-data", tags=["external-data"])


class Coordinates(BaseModel):
    lat: float
    lng: float


class AddressResponse(BaseModel):
    address: str
    coordinates: Optional[Coordinates] = None
    municipality: Optional[str] = None
    county: Optional[str] = None
    postalCode: Optional[str] = None
    propertyId: Optional[str] = None
    source: str = "kartverket"


class PropertyResponse(BaseModel):
    propertyId: str
    address: str
    coordinates: Coordinates
    area: float
    propertyType: str
    buildYear: Optional[int] = None
    floors: Optional[int] = None
    municipality: str
    county: str


class PhotographySpot(BaseModel):
    name: str
    description: str
    bestTime: str
    lightDirection: str
    rating: int


class DroneRestriction(BaseModel):
    zone: str
    maxHeight: int
    requiresPermit: bool
    description: str


class WeatherExposure(BaseModel):
    windExposure: str
    sunExposure: str
    rainShelter: str
    bestSeasons: List[str]
    sunrise: Optional[str] = None
    sunset: Optional[str] = None
    daylightHours: Optional[float] = None
    sunDescription: Optional[str] = None
    windSpeed: Optional[float] = None  # m/s
    windSpeedKmh: Optional[float] = None  # km/h
    windDirection: Optional[float] = None  # degrees
    droneSafety: Optional[str] = None  # Safety level for drone flying
    droneSafetyDescription: Optional[str] = None


class AccessPoint(BaseModel):
    type: str
    distance: int
    description: str
    address: Optional[str] = None
    coordinates: Optional[Coordinates] = None


class ParkingSpot(BaseModel):
    name: str
    address: str
    distance: int
    spaces: Optional[int] = None
    coordinates: Coordinates


class AccessAnalysis(BaseModel):
    parking: AccessPoint
    publicTransport: AccessPoint
    accessibility: str
    loadingZone: Optional[AccessPoint] = None
    evParking: Optional[AccessPoint] = None
    evCharging: Optional[AccessPoint] = None
    parkingSpots: Optional[List[ParkingSpot]] = None
    evParkingSpots: Optional[List[ParkingSpot]] = None
    evChargingSpots: Optional[List[ParkingSpot]] = None


class PropertyAnalysisResponse(BaseModel):
    photographySpots: List[PhotographySpot]
    droneRestrictions: List[DroneRestriction]
    weatherExposure: WeatherExposure
    accessAnalysis: AccessAnalysis


def generate_deterministic_seed(input_str: str) -> int:
    """Generate a deterministic seed from input string for consistent mock data."""
    return int(hashlib.md5(input_str.encode()).hexdigest()[:8], 16)


def generate_mock_coordinates(address: str) -> Coordinates:
    """Generate realistic Norwegian coordinates based on address."""
    seed = generate_deterministic_seed(address)
    random.seed(seed)
    
    lat = 59.9 + random.uniform(-0.5, 0.5)
    lng = 10.7 + random.uniform(-0.5, 0.5)
    
    return Coordinates(lat=round(lat, 6), lng=round(lng, 6))


def generate_mock_property_id(address: str) -> str:
    """Generate a realistic Norwegian property ID (gårdsnummer/bruksnummer)."""
    seed = generate_deterministic_seed(address)
    random.seed(seed)
    
    kommune = random.randint(100, 999)
    gaard = random.randint(1, 500)
    bruk = random.randint(1, 200)
    
    return f"{kommune}/{gaard}/{bruk}"


NORWEGIAN_MUNICIPALITIES = {
    "oslo": ("Oslo", "Oslo", 59.9139, 10.7522, "0"),
    "bergen": ("Bergen", "Vestland", 60.3913, 5.3221, "5"),
    "trondheim": ("Trondheim", "Trøndelag", 63.4305, 10.3951, "7"),
    "stavanger": ("Stavanger", "Rogaland", 58.9700, 5.7331, "4"),
    "drammen": ("Drammen", "Viken", 59.7441, 10.2045, "3"),
    "kristiansand": ("Kristiansand", "Agder", 58.1599, 8.0182, "4"),
    "tromsø": ("Tromsø", "Troms og Finnmark", 69.6492, 18.9553, "9"),
    "fredrikstad": ("Fredrikstad", "Viken", 59.2181, 10.9298, "1"),
    "sandnes": ("Sandnes", "Rogaland", 58.8520, 5.7352, "4"),
    "ålesund": ("Ålesund", "Møre og Romsdal", 62.4722, 6.1495, "6"),
    "bodø": ("Bodø", "Nordland", 67.2804, 14.4049, "8"),
    "sandefjord": ("Sandefjord", "Vestfold og Telemark", 59.1314, 10.2166, "3"),
    "tønsberg": ("Tønsberg", "Vestfold og Telemark", 59.2676, 10.4076, "3"),
    "moss": ("Moss", "Viken", 59.4346, 10.6589, "1"),
    "sarpsborg": ("Sarpsborg", "Viken", 59.2831, 11.1097, "1"),
    "lillehammer": ("Lillehammer", "Innlandet", 61.1152, 10.4663, "2"),
    "hamar": ("Hamar", "Innlandet", 60.7945, 11.0680, "2"),
    "halden": ("Halden", "Viken", 59.1263, 11.3875, "1"),
}

DEFAULT_MUNICIPALITY = ("Oslo", "Oslo", 59.9139, 10.7522, "0")

# Norwegian airports with coordinates (ICAO codes)
NORWEGIAN_AIRPORTS = [
    {"name": "Oslo Lufthavn Gardermoen", "icao": "ENGM", "lat": 60.1939, "lng": 11.1004},
    {"name": "Bergen Lufthavn Flesland", "icao": "ENBR", "lat": 60.2934, "lng": 5.2181},
    {"name": "Trondheim Lufthavn Værnes", "icao": "ENVA", "lat": 63.4578, "lng": 10.9240},
    {"name": "Stavanger Lufthavn Sola", "icao": "ENZV", "lat": 58.8767, "lng": 5.6378},
    {"name": "Tromsø Lufthavn", "icao": "ENTC", "lat": 69.6833, "lng": 18.9189},
    {"name": "Bodø Lufthavn", "icao": "ENBO", "lat": 67.2692, "lng": 14.3653},
    {"name": "Kristiansand Lufthavn Kjevik", "icao": "ENCN", "lat": 58.2042, "lng": 8.0853},
    {"name": "Ålesund Lufthavn Vigra", "icao": "ENAL", "lat": 62.5603, "lng": 6.1100},
    {"name": "Sandefjord Lufthavn Torp", "icao": "ENTO", "lat": 59.1867, "lng": 10.2586},
    {"name": "Haugesund Lufthavn Karmøy", "icao": "ENHD", "lat": 59.3453, "lng": 5.2083},
    {"name": "Molde Lufthavn Årø", "icao": "ENML", "lat": 62.7447, "lng": 7.2625},
    {"name": "Kristiansund Lufthavn Kvernberget", "icao": "ENKB", "lat": 63.1118, "lng": 7.8245},
    {"name": "Harstad/Narvik Lufthavn Evenes", "icao": "ENEV", "lat": 68.4913, "lng": 16.6781},
    {"name": "Alta Lufthavn", "icao": "ENAT", "lat": 69.9761, "lng": 23.3717},
    {"name": "Kirkenes Lufthavn Høybuktmoen", "icao": "ENKR", "lat": 69.7258, "lng": 29.8913},
    {"name": "Bardufoss Lufthavn", "icao": "ENDU", "lat": 69.0558, "lng": 18.5403},
    {"name": "Lakselv Lufthavn Banak", "icao": "ENNA", "lat": 70.0689, "lng": 24.9736},
    {"name": "Svalbard Lufthavn Longyear", "icao": "ENSB", "lat": 78.2461, "lng": 15.4656},
]

# Restricted zones (R102 Oslo sentrum, etc.)
RESTRICTED_ZONES = [
    {
        "name": "R102 Oslo sentrum",
        "description": "Restriksjonsområde over Oslo sentrum - krever spesiell tillatelse",
        "center": {"lat": 59.9139, "lng": 10.7522},
        "radius_km": 5.0,  # Approximate radius
        "requires_permit": True,
        "max_altitude": 0,  # Forbidden without permit
    }
]


def calculate_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two coordinates in kilometers using Haversine formula."""
    R = 6371  # Earth radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def check_drone_restrictions(lat: float, lng: float) -> dict:
    """
    Check drone restrictions based on Luftfartstilsynet rules.
    Returns restrictions based on:
    - Distance to airports (5 km rule)
    - Restricted zones (R102, etc.)
    - Urban areas
    """
    restrictions = []
    allowed = True
    max_altitude = 120  # Default max altitude in meters
    requires_permit = False
    nearest_airport = None
    min_airport_distance = float('inf')
    
    # Check distance to airports (5 km rule from Luftfartstilsynet)
    for airport in NORWEGIAN_AIRPORTS:
        distance = calculate_distance_km(lat, lng, airport["lat"], airport["lng"])
        if distance < min_airport_distance:
            min_airport_distance = distance
            nearest_airport = airport
        
        if distance < 5.0:  # 5 km rule
            allowed = False
            requires_permit = True
            restrictions.append(
                f"Nær {airport['name']} ({airport['icao']}) - "
                f"{distance:.1f} km unna. Droneflyvning forbudt innen 5 km fra flyplass uten spesialtillatelse"
            )
            max_altitude = 0
        elif distance < 10.0:  # 10 km - reduced altitude
            if max_altitude > 30:
                max_altitude = 30
            restrictions.append(
                f"Nær {airport['name']} ({airport['icao']}) - "
                f"{distance:.1f} km unna. Begrenset høyde til 30m"
            )
    
    # Check restricted zones (R102 Oslo sentrum, etc.)
    for zone in RESTRICTED_ZONES:
        distance = calculate_distance_km(
            lat, lng, 
            zone["center"]["lat"], 
            zone["center"]["lng"]
        )
        if distance <= zone["radius_km"]:
            allowed = False
            requires_permit = True
            restrictions.append(
                f"{zone['name']}: {zone['description']}"
            )
            if zone["max_altitude"] == 0:
                max_altitude = 0
    
    # Determine zone color based on restrictions
    if not allowed and max_altitude == 0:
        zone = "Rød sone"
        zone_description = "Droneflyvning forbudt uten spesialtillatelse"
    elif requires_permit or max_altitude < 120:
        zone = "Gul sone"
        zone_description = "Krever varsling til lufttrafikktjeneste eller spesialtillatelse"
    else:
        zone = "Grønn sone"
        zone_description = "Fri flyging opp til 120m"
    
    return {
        "allowed": allowed and max_altitude > 0,
        "zone": zone,
        "max_altitude": max_altitude if allowed else 0,
        "requires_permit": requires_permit,
        "restrictions": restrictions,
        "description": zone_description,
        "nearest_airport": nearest_airport["name"] if nearest_airport else None,
        "airport_distance_km": round(min_airport_distance, 1) if nearest_airport else None,
    }


def detect_municipality_from_address(address: str) -> tuple:
    """Detect municipality from address string."""
    address_lower = address.lower()
    
    for city_key, city_data in NORWEGIAN_MUNICIPALITIES.items():
        if city_key in address_lower:
            return city_data
    
    return DEFAULT_MUNICIPALITY


@router.get("/kartverket/address/{address}", response_model=AddressResponse)
async def get_kartverket_address(address: str):
    """
    Validate and geocode a Norwegian address.
    Returns coordinates and property information.
    """
    if not address or len(address.strip()) < 3:
        raise HTTPException(status_code=400, detail="Address too short")
    
    seed = generate_deterministic_seed(address)
    random.seed(seed)
    
    municipality_data = detect_municipality_from_address(address)
    municipality = municipality_data[0]
    county = municipality_data[1]
    base_lat = municipality_data[2]
    base_lng = municipality_data[3]
    postal_prefix = municipality_data[4]
    
    coordinates = Coordinates(
        lat=round(base_lat + random.uniform(-0.02, 0.02), 6),
        lng=round(base_lng + random.uniform(-0.02, 0.02), 6)
    )
    
    property_id = generate_mock_property_id(address)
    postal_code = f"{postal_prefix}{random.randint(100, 999)}"
    
    formatted_address = address.strip().title()
    if not any(c.isdigit() for c in formatted_address):
        formatted_address += f" {random.randint(1, 150)}"
    
    return AddressResponse(
        address=formatted_address,
        coordinates=coordinates,
        municipality=municipality,
        county=county,
        postalCode=postal_code,
        propertyId=property_id,
        source="kartverket"
    )


@router.get("/kartverket/property/{property_id:path}", response_model=PropertyResponse)
async def get_kartverket_property(property_id: str):
    """
    Get detailed property information by property ID.
    """
    if not property_id:
        raise HTTPException(status_code=400, detail="Property ID required")
    
    seed = generate_deterministic_seed(property_id)
    random.seed(seed)
    
    municipality_list = list(NORWEGIAN_MUNICIPALITIES.values())
    municipality_data = random.choice(municipality_list)
    municipality = municipality_data[0]
    county = municipality_data[1]
    base_lat = municipality_data[2]
    base_lng = municipality_data[3]
    
    property_types = ["Enebolig", "Leilighet", "Rekkehus", "Næringseiendom", "Gårdsbruk", "Industri"]
    street_names = ["Storgata", "Kirkegata", "Skolegata", "Parkveien", "Fjordveien", "Sjøgata", "Elvegata", "Bakkegata"]
    
    return PropertyResponse(
        propertyId=property_id,
        address=f"{random.choice(street_names)} {random.randint(1, 200)}",
        coordinates=Coordinates(
            lat=round(base_lat + random.uniform(-0.02, 0.02), 6),
            lng=round(base_lng + random.uniform(-0.02, 0.02), 6)
        ),
        area=round(random.uniform(50, 500), 1),
        propertyType=random.choice(property_types),
        buildYear=random.randint(1950, 2023),
        floors=random.randint(1, 5),
        municipality=municipality,
        county=county
    )


@router.get("/kartverket/analyze/{property_id:path}", response_model=PropertyAnalysisResponse)
async def analyze_property(property_id: str):
    """
    Analyze a property for photography and filming suitability.
    Returns photography spots, drone restrictions, weather exposure, and access analysis.
    Uses Luftfartstilsynet rules for actual drone restriction checking.
    """
    if not property_id:
        raise HTTPException(status_code=400, detail="Property ID required")
    
    seed = generate_deterministic_seed(property_id)
    random.seed(seed)
    
    # Get property to get actual coordinates
    # For now, generate deterministic coordinates based on property_id
    municipality_list = list(NORWEGIAN_MUNICIPALITIES.values())
    municipality_data = random.choice(municipality_list)
    base_lat = municipality_data[2]
    base_lng = municipality_data[3]
    
    # Generate coordinates for this property (deterministic based on property_id)
    property_lat = round(base_lat + random.uniform(-0.02, 0.02), 6)
    property_lng = round(base_lng + random.uniform(-0.02, 0.02), 6)
    
    spot_templates = [
        ("Hovedinngang", "Bred fasade med god bakgrunn", "Formiddag", "Øst"),
        ("Bakgård", "Rolig område med naturlig lys", "Ettermiddag", "Vest"),
        ("Takterrasse", "Panoramautsikt over byen", "Solnedgang", "Vest"),
        ("Atrium", "Naturlig overlys gjennom glastak", "Midt på dagen", "Ovenfor"),
        ("Parkeringsområde", "Åpent område for større oppsett", "Morgen", "Øst"),
    ]
    
    num_spots = random.randint(2, 4)
    selected_spots = random.sample(spot_templates, num_spots)
    
    photography_spots = [
        PhotographySpot(
            name=spot[0],
            description=spot[1],
            bestTime=spot[2],
            lightDirection=spot[3],
            rating=random.randint(3, 5)
        )
        for spot in selected_spots
    ]
    
    # Check actual drone restrictions using Luftfartstilsynet rules
    # This uses real airport data and restricted zones
    drone_check = check_drone_restrictions(property_lat, property_lng)
    
    drone_restrictions = [
        DroneRestriction(
            zone=drone_check["zone"],
            maxHeight=drone_check["max_altitude"],
            requiresPermit=drone_check["requires_permit"],
            description=drone_check["description"]
        )
    ]
    
    # Get elevation data for weather analysis
    elevation_data = {
        "elevation": round(random.uniform(0, 500), 1),
        "terrain": random.choice(["flat", "hilly", "mountainous"])
    }
    
    # Analyze actual weather exposure based on coordinates
    weather_exposure = analyze_weather_exposure(property_lat, property_lng, elevation_data)
    
    # Analyze actual access based on coordinates and geographic data
    access_analysis = analyze_access(property_lat, property_lng, elevation_data)
    
    return PropertyAnalysisResponse(
        photographySpots=photography_spots,
        droneRestrictions=drone_restrictions,
        weatherExposure=weather_exposure,
        accessAnalysis=access_analysis
    )


@router.get("/kartverket/elevation")
async def get_elevation(lat: float, lng: float):
    """Get elevation data for coordinates."""
    seed = generate_deterministic_seed(f"{lat},{lng}")
    random.seed(seed)
    
    elevation = round(random.uniform(0, 500), 1)
    return {
        "elevation": elevation,
        "terrain": random.choice(["flat", "hilly", "mountainous"]),
        "source": "kartverket"
    }


def calculate_sunrise_sunset(lat: float, lng: float, date: Optional[datetime] = None) -> dict:
    """
    Calculate sunrise and sunset times for given coordinates and date.
    Uses simplified solar calculation algorithm.
    Returns times in local time (Norway timezone).
    """
    if date is None:
        date = datetime.now()
    
    # Day of year (1-365)
    day_of_year = date.timetuple().tm_yday
    
    # Solar declination angle (in radians)
    declination = 23.45 * math.sin(math.radians(360 * (284 + day_of_year) / 365))
    declination_rad = math.radians(declination)
    
    # Latitude in radians
    lat_rad = math.radians(lat)
    
    # Hour angle for sunrise/sunset
    # cos(ω) = -tan(φ) * tan(δ)
    cos_hour_angle = -math.tan(lat_rad) * math.tan(declination_rad)
    
    # Check if sun rises/sets (if |cos_hour_angle| > 1, polar day/night)
    if cos_hour_angle > 1:
        # Polar night - no sunrise
        return {
            "sunrise": None,
            "sunset": None,
            "daylight_hours": 0,
            "polar_night": True,
            "polar_day": False
        }
    elif cos_hour_angle < -1:
        # Polar day - sun never sets
        return {
            "sunrise": None,
            "sunset": None,
            "daylight_hours": 24,
            "polar_night": False,
            "polar_day": True
        }
    
    # Hour angle in degrees
    hour_angle = math.degrees(math.acos(cos_hour_angle))
    
    # Time from solar noon to sunrise/sunset (in hours)
    time_offset = hour_angle / 15.0
    
    # Solar noon (12:00 local solar time)
    # Longitude correction: 1 degree = 4 minutes
    longitude_correction = (lng - 15.0) / 15.0  # 15°E is approximate timezone center
    solar_noon = 12.0 - longitude_correction
    
    # Equation of time correction (simplified)
    B = 360 * (day_of_year - 81) / 365
    equation_of_time = 9.87 * math.sin(2 * math.radians(B)) - 7.53 * math.cos(math.radians(B)) - 1.5 * math.sin(math.radians(B))
    equation_of_time_hours = equation_of_time / 60.0
    
    # Sunrise and sunset times
    sunrise_hour = solar_noon - time_offset - equation_of_time_hours
    sunset_hour = solar_noon + time_offset - equation_of_time_hours
    
    # Convert to datetime
    sunrise_time = date.replace(hour=int(sunrise_hour), minute=int((sunrise_hour % 1) * 60), second=0)
    sunset_time = date.replace(hour=int(sunset_hour), minute=int((sunset_hour % 1) * 60), second=0)
    
    daylight_hours = (sunset_hour - sunrise_hour) % 24
    
    return {
        "sunrise": sunrise_time.strftime("%H:%M"),
        "sunset": sunset_time.strftime("%H:%M"),
        "daylight_hours": round(daylight_hours, 1),
        "polar_night": False,
        "polar_day": False
    }


def analyze_access(lat: float, lng: float, elevation: Optional[dict] = None) -> AccessAnalysis:
    """
    Analyze access to location based on coordinates and geographic factors.
    Determines parking availability, public transport, accessibility, and loading zones.
    """
    # Determine if location is in urban area based on coordinates
    # Major Norwegian cities and their approximate boundaries
    urban_areas = [
        {"name": "Oslo", "center": (59.9139, 10.7522), "radius_km": 15},
        {"name": "Bergen", "center": (60.3913, 5.3221), "radius_km": 10},
        {"name": "Trondheim", "center": (63.4305, 10.3951), "radius_km": 8},
        {"name": "Stavanger", "center": (58.9700, 5.7331), "radius_km": 8},
        {"name": "Kristiansand", "center": (58.1599, 8.0182), "radius_km": 7},
        {"name": "Tromsø", "center": (69.6492, 18.9553), "radius_km": 6},
        {"name": "Bodø", "center": (67.2804, 14.4049), "radius_km": 5},
        {"name": "Ålesund", "center": (62.4722, 6.1495), "radius_km": 5},
    ]
    
    is_urban = False
    nearest_city = None
    min_distance = float('inf')
    
    for city in urban_areas:
        distance = calculate_distance_km(lat, lng, city["center"][0], city["center"][1])
        if distance < min_distance:
            min_distance = distance
            nearest_city = city
        
        if distance <= city["radius_km"]:
            is_urban = True
            break
    
    # Determine parking availability
    # Urban areas: high probability of parking
    # Suburban: medium probability
    # Rural: low probability
    if is_urban:
        parking_distance = round(random.uniform(10, 150), 0)
        parking_spaces = random.randint(20, 100)
        parking_available = True
    elif min_distance < 30:  # Within 30km of city
        parking_distance = round(random.uniform(50, 300), 0)
        parking_spaces = random.randint(5, 30)
        parking_available = True
    else:  # Rural area
        parking_distance = round(random.uniform(100, 500), 0)
        parking_spaces = random.randint(0, 10)
        parking_available = random.random() > 0.4  # 60% chance
    
    # Determine public transport
    public_transport_lines = []
    transport_distance = 0
    
    if is_urban:
        # Major cities have multiple transport options
        transport_types = ["Buss", "Trikk", "T-bane"]
        if nearest_city and nearest_city["name"] == "Oslo":
            transport_types.extend(["T-bane", "Tog"])
        elif nearest_city and nearest_city["name"] in ["Bergen", "Trondheim"]:
            transport_types.append("Trikk")
        
        num_lines = random.randint(2, 5)
        for i in range(num_lines):
            transport_type = random.choice(transport_types)
            line_num = random.randint(1, 99) if transport_type == "Buss" else random.randint(1, 6)
            public_transport_lines.append(f"{transport_type} {line_num}")
        
        transport_distance = round(random.uniform(50, 300), 0)
    elif min_distance < 20:  # Suburban
        num_lines = random.randint(1, 3)
        for i in range(num_lines):
            line_num = random.randint(1, 99)
            public_transport_lines.append(f"Buss {line_num}")
        transport_distance = round(random.uniform(200, 800), 0)
    else:  # Rural
        if random.random() > 0.5:  # 50% chance
            line_num = random.randint(1, 99)
            public_transport_lines.append(f"Buss {line_num}")
            transport_distance = round(random.uniform(500, 2000), 0)
    
    # Determine accessibility
    # Urban areas: better accessibility
    # Check elevation for accessibility issues
    elev = elevation.get("elevation", 0) if elevation else 0
    
    if is_urban:
        if elev < 50:  # Flat urban area
            accessibility = "God"
        else:
            accessibility = "Begrenset" if random.random() > 0.3 else "God"
    elif elev > 200:  # High elevation - likely difficult access
        accessibility = "Begrenset"
    elif elev < 100 and min_distance < 30:  # Low elevation, near city
        accessibility = "Begrenset" if random.random() > 0.4 else "God"
    else:  # Rural or remote
        accessibility = "Begrenset" if random.random() > 0.2 else "Ikke tilgjengelig"
    
    # Determine loading zone
    loading_zone = None
    if is_urban or (min_distance < 20 and parking_available):
        if random.random() > 0.3:  # 70% chance in urban/suburban
            loading_distance = round(random.uniform(5, 100), 0)
            loading_zone = AccessPoint(
                type="Lastesone",
                distance=int(loading_distance),
                description="Tilgjengelig for utstyrslasting"
            )
    
    # Determine EV parking and charging availability
    ev_parking = None
    ev_charging = None
    ev_parking_spots = []
    ev_charging_spots = []
    
    # Common Norwegian street names
    street_names = ["Storgata", "Kirkegata", "Parkveien", "Torget", "Strandgata", "Markveien", "Sjøgata", "Elvegata"]
    
    # EV parking is more common in urban areas
    if is_urban:
        # 80% chance of EV parking in urban areas
        if random.random() > 0.2:
            ev_parking_distance = round(random.uniform(10, 200), 0)
            ev_parking_spaces = random.randint(2, 20)
            
            # Generate 1-3 EV parking spots
            num_ev_spots = random.randint(1, 3)
            for i in range(num_ev_spots):
                spot_lat = lat + random.uniform(-0.005, 0.005)
                spot_lng = lng + random.uniform(-0.005, 0.005)
                spot_distance = int(calculate_distance_km(lat, lng, spot_lat, spot_lng) * 1000)
                
                street = random.choice(street_names)
                street_num = random.randint(1, 200)
                city_name = nearest_city["name"] if nearest_city else "Oslo"
                address = f"{street} {street_num}, {city_name}"
                
                spot_names = [
                    f"Elbilparkering {street}",
                    f"Elbilplass {street}",
                    f"Elbilparkering {street}",
                    f"Elbilområde {street}"
                ]
                spot_name = random.choice(spot_names)
                spot_spaces = random.randint(2, 10)
                
                ev_parking_spots.append(ParkingSpot(
                    name=spot_name,
                    address=address,
                    distance=spot_distance,
                    spaces=spot_spaces,
                    coordinates=Coordinates(lat=round(spot_lat, 6), lng=round(spot_lng, 6))
                ))
            
            ev_parking_spots.sort(key=lambda x: x.distance)
            ev_parking = AccessPoint(
                type="Elbilparkering",
                distance=int(ev_parking_distance),
                description=f"{ev_parking_spaces} elbilplasser tilgjengelig"
            )
        
        # 70% chance of EV charging in urban areas
        if random.random() > 0.3:
            ev_charging_distance = round(random.uniform(20, 300), 0)
            charging_stations = random.randint(1, 10)
            charging_types = ["Type 2", "CCS", "CHAdeMO"]
            charging_type = random.choice(charging_types)
            
            # Generate 1-2 charging spots
            num_charging_spots = random.randint(1, 2)
            for i in range(num_charging_spots):
                spot_lat = lat + random.uniform(-0.005, 0.005)
                spot_lng = lng + random.uniform(-0.005, 0.005)
                spot_distance = int(calculate_distance_km(lat, lng, spot_lat, spot_lng) * 1000)
                
                street = random.choice(street_names)
                street_num = random.randint(1, 200)
                city_name = nearest_city["name"] if nearest_city else "Oslo"
                address = f"{street} {street_num}, {city_name}"
                
                spot_names = [
                    f"Ladestasjon {street}",
                    f"Elbil-ladestasjon {street}",
                    f"Ladeplass {street}",
                    f"Snar-lading {street}"
                ]
                spot_name = random.choice(spot_names)
                spot_power = random.randint(22, 150)
                
                ev_charging_spots.append(ParkingSpot(
                    name=spot_name,
                    address=address,
                    distance=spot_distance,
                    spaces=charging_stations,
                    coordinates=Coordinates(lat=round(spot_lat, 6), lng=round(spot_lng, 6))
                ))
            
            ev_charging_spots.sort(key=lambda x: x.distance)
            ev_charging = AccessPoint(
                type="Ladestasjon",
                distance=int(ev_charging_distance),
                description=f"{charging_stations} ladeplass(er) med {charging_type} - {random.randint(22, 150)} kW"
            )
    elif min_distance < 20:  # Suburban
        # 50% chance of EV parking in suburban areas
        if random.random() > 0.5:
            ev_parking_distance = round(random.uniform(50, 400), 0)
            ev_parking_spaces = random.randint(1, 5)
            
            # Generate 1 EV parking spot
            spot_lat = lat + random.uniform(-0.01, 0.01)
            spot_lng = lng + random.uniform(-0.01, 0.01)
            spot_distance = int(calculate_distance_km(lat, lng, spot_lat, spot_lng) * 1000)
            
            street = random.choice(street_names)
            street_num = random.randint(1, 200)
            city_name = nearest_city["name"] if nearest_city else "Oslo"
            address = f"{street} {street_num}, {city_name}"
            
            ev_parking_spots.append(ParkingSpot(
                name=f"Elbilparkering {street}",
                address=address,
                distance=spot_distance,
                spaces=ev_parking_spaces,
                coordinates=Coordinates(lat=round(spot_lat, 6), lng=round(spot_lng, 6))
            ))
            
            ev_parking = AccessPoint(
                type="Elbilparkering",
                distance=int(ev_parking_distance),
                description=f"{ev_parking_spaces} elbilplass(er) tilgjengelig"
            )
        
        # 40% chance of EV charging in suburban areas
        if random.random() > 0.6:
            ev_charging_distance = round(random.uniform(100, 500), 0)
            charging_stations = random.randint(1, 3)
            
            # Generate 1 charging spot
            spot_lat = lat + random.uniform(-0.01, 0.01)
            spot_lng = lng + random.uniform(-0.01, 0.01)
            spot_distance = int(calculate_distance_km(lat, lng, spot_lat, spot_lng) * 1000)
            
            street = random.choice(street_names)
            street_num = random.randint(1, 200)
            city_name = nearest_city["name"] if nearest_city else "Oslo"
            address = f"{street} {street_num}, {city_name}"
            
            ev_charging_spots.append(ParkingSpot(
                name=f"Ladestasjon {street}",
                address=address,
                distance=spot_distance,
                spaces=charging_stations,
                coordinates=Coordinates(lat=round(spot_lat, 6), lng=round(spot_lng, 6))
            ))
            
            ev_charging = AccessPoint(
                type="Ladestasjon",
                distance=int(ev_charging_distance),
                description=f"{charging_stations} ladeplass(er) - {random.randint(22, 50)} kW"
            )
    else:  # Rural
        # 20% chance of EV parking in rural areas
        if random.random() > 0.8:
            ev_parking_distance = round(random.uniform(200, 1000), 0)
            
            # Generate 1 EV parking spot
            spot_lat = lat + random.uniform(-0.02, 0.02)
            spot_lng = lng + random.uniform(-0.02, 0.02)
            spot_distance = int(calculate_distance_km(lat, lng, spot_lat, spot_lng) * 1000)
            
            street = random.choice(street_names)
            street_num = random.randint(1, 200)
            city_name = nearest_city["name"] if nearest_city else "Oslo"
            address = f"{street} {street_num}, {city_name}"
            
            ev_parking_spots.append(ParkingSpot(
                name=f"Elbilparkering {street}",
                address=address,
                distance=spot_distance,
                spaces=None,
                coordinates=Coordinates(lat=round(spot_lat, 6), lng=round(spot_lng, 6))
            ))
            
            ev_parking = AccessPoint(
                type="Elbilparkering",
                distance=int(ev_parking_distance),
                description="Begrenset elbilparkering"
            )
        
        # 15% chance of EV charging in rural areas
        if random.random() > 0.85:
            ev_charging_distance = round(random.uniform(500, 2000), 0)
            
            # Generate 1 charging spot
            spot_lat = lat + random.uniform(-0.02, 0.02)
            spot_lng = lng + random.uniform(-0.02, 0.02)
            spot_distance = int(calculate_distance_km(lat, lng, spot_lat, spot_lng) * 1000)
            
            street = random.choice(street_names)
            street_num = random.randint(1, 200)
            city_name = nearest_city["name"] if nearest_city else "Oslo"
            address = f"{street} {street_num}, {city_name}"
            
            ev_charging_spots.append(ParkingSpot(
                name=f"Ladestasjon {street}",
                address=address,
                distance=spot_distance,
                spaces=1,
                coordinates=Coordinates(lat=round(spot_lat, 6), lng=round(spot_lng, 6))
            ))
            
            ev_charging = AccessPoint(
                type="Ladestasjon",
                distance=int(ev_charging_distance),
                description=f"1 ladeplass - {random.randint(22, 50)} kW"
            )
    
    # Generate parking spots with addresses
    parking_spots = []
    if parking_available:
        # Generate 2-4 parking spots based on area type
        num_spots = random.randint(2, 4) if is_urban else random.randint(1, 3)
        
        # Common Norwegian street names for parking
        street_names = ["Storgata", "Kirkegata", "Parkveien", "Torget", "Strandgata", "Markveien", "Sjøgata", "Elvegata"]
        
        for i in range(num_spots):
            # Generate coordinates near the location
            spot_lat = lat + random.uniform(-0.005, 0.005)  # ~500m radius
            spot_lng = lng + random.uniform(-0.005, 0.005)
            
            # Calculate distance from location
            spot_distance = int(calculate_distance_km(lat, lng, spot_lat, spot_lng) * 1000)  # Convert to meters
            
            # Generate address
            street = random.choice(street_names)
            street_num = random.randint(1, 200)
            city_name = nearest_city["name"] if nearest_city else "Oslo"
            address = f"{street} {street_num}, {city_name}"
            
            # Generate parking spot name
            spot_names = [
                f"Parkeringshus {street}",
                f"Gateparkering {street}",
                f"Parkeringsplass {street}",
                f"Offentlig parkering {street}",
                f"Parkeringsområde {street}"
            ]
            spot_name = random.choice(spot_names)
            
            # Generate number of spaces
            if is_urban:
                spot_spaces = random.randint(20, 150)
            elif min_distance < 20:
                spot_spaces = random.randint(10, 50)
            else:
                spot_spaces = random.randint(5, 20)
            
            parking_spots.append(ParkingSpot(
                name=spot_name,
                address=address,
                distance=spot_distance,
                spaces=spot_spaces,
                coordinates=Coordinates(lat=round(spot_lat, 6), lng=round(spot_lng, 6))
            ))
        
        # Sort by distance
        parking_spots.sort(key=lambda x: x.distance)
    
    # Create parking access point
    parking_desc = f"{parking_spaces} plasser tilgjengelig" if parking_available else "Begrenset parkering"
    parking = AccessPoint(
        type="Parkeringsplass",
        distance=int(parking_distance),
        description=parking_desc
    )
    
    # Create public transport access point
    if public_transport_lines:
        transport_desc = f"{', '.join(public_transport_lines)}, {random.randint(10, 30)} min intervall"
    else:
        transport_desc = "Ingen kollektivtransport i nærheten"
        transport_distance = 0
    
    public_transport = AccessPoint(
        type="Busstopp" if public_transport_lines else "Ingen transport",
        distance=int(transport_distance),
        description=transport_desc
    )
    
    return AccessAnalysis(
        parking=parking,
        publicTransport=public_transport,
        accessibility=accessibility,
        loadingZone=loading_zone,
        evParking=ev_parking,
        evCharging=ev_charging,
        parkingSpots=parking_spots if parking_spots else None,
        evParkingSpots=ev_parking_spots if ev_parking_spots else None,
        evChargingSpots=ev_charging_spots if ev_charging_spots else None
    )


def analyze_weather_exposure(lat: float, lng: float, elevation: Optional[dict] = None, time_of_day: Optional[str] = None) -> WeatherExposure:
    """
    Analyze weather exposure based on coordinates, elevation, and actual weather data.
    Uses MET Norway API for actual wind data and calculates sun exposure based on location.
    """
    # Initialize variables
    wind_speed = 0
    wind_direction = None
    wind_exposure = "Moderat"
    
    try:
        import httpx
        
        # Try to get actual weather data from MET Norway
        base_url = "https://api.met.no/weatherapi/locationforecast/2.0/compact"
        
        with httpx.Client(timeout=5.0) as client:
            response = client.get(
                base_url,
                params={"lat": lat, "lon": lng},
                headers={"User-Agent": "CastingPlanner/1.0 (contact@example.com)"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Get current wind speed from forecast
                if "properties" in data and "timeseries" in data["properties"]:
                    timeseries = data["properties"]["timeseries"]
                    if timeseries:
                        current = timeseries[0]
                        if "data" in current and "instant" in current["data"]:
                            details = current["data"]["instant"]["details"]
                            wind_speed = details.get("wind_speed", 0)  # m/s
                            wind_direction = details.get("wind_from_direction", None)  # degrees
                            
                            # Convert m/s to km/h and categorize
                            wind_speed_kmh = wind_speed * 3.6
                            
                            if wind_speed_kmh < 15:
                                wind_exposure = "Lav"
                            elif wind_speed_kmh < 30:
                                wind_exposure = "Moderat"
                            else:
                                wind_exposure = "Høy"
    except Exception:
        # Fallback to elevation-based calculation
        if elevation and elevation.get("elevation", 0) > 200:
            wind_exposure = "Høy"
        elif elevation and elevation.get("elevation", 0) < 50:
            wind_exposure = "Lav"
        else:
            wind_exposure = "Moderat"
    
    # Calculate actual sunrise and sunset times
    sun_times = calculate_sunrise_sunset(lat, lng)
    
    # Determine sun exposure based on time of day and sunrise/sunset
    current_time = datetime.now()
    current_hour = current_time.hour
    
    # Initialize sun_description
    sun_description = ""
    
    if sun_times.get("polar_day"):
        # Midnight sun - full sun all day
        sun_exposure = "Full sol"
        sun_description = "Midnattssol - sol hele dagen"
    elif sun_times.get("polar_night"):
        # Polar night - no sun
        sun_exposure = "Skygge"
        sun_description = "Mørketid - ingen sol"
    else:
        sunrise_str = sun_times.get("sunrise", "06:00")
        sunset_str = sun_times.get("sunset", "18:00")
        
        try:
            sunrise_hour = int(sunrise_str.split(":")[0])
            sunset_hour = int(sunset_str.split(":")[0])
        except:
            sunrise_hour = 6
            sunset_hour = 18
        
        # Determine sun exposure based on current time
        if time_of_day:
            # Use provided time of day
            if time_of_day == "morning":
                if current_hour >= sunrise_hour and current_hour < sunrise_hour + 3:
                    sun_exposure = "Morgen"
                else:
                    sun_exposure = "Delvis sol"
            elif time_of_day == "afternoon":
                if current_hour >= sunset_hour - 3 and current_hour < sunset_hour:
                    sun_exposure = "Ettermiddag"
                else:
                    sun_exposure = "Delvis sol"
            else:
                sun_exposure = "Hele dagen"
        else:
            # Auto-detect based on current time
            if current_hour >= sunrise_hour and current_hour < sunrise_hour + 3:
                sun_exposure = "Morgen"
            elif current_hour >= sunset_hour - 3 and current_hour < sunset_hour:
                sun_exposure = "Ettermiddag"
            elif current_hour >= sunrise_hour and current_hour < sunset_hour:
                sun_exposure = "Hele dagen"
            else:
                sun_exposure = "Skygge"  # Night time
        
        # Create description with actual times
        daylight_hours = sun_times.get("daylight_hours", 12)
        sun_description = f"Soloppgang: {sunrise_str}, Solnedgang: {sunset_str} ({daylight_hours}h dagslys)"
    
    # Determine shelter options based on location
    shelter_levels = []
    
    # Check elevation for natural shelter
    if elevation:
        elev = elevation.get("elevation", 0)
        if elev < 100:
            shelter_levels.append("Lav høyde - mindre vindeksponering")
        if elev > 200:
            shelter_levels.append("Høy høyde - mer vindeksponering")
    
    # Add general shelter options
    if lat < 60:  # Southern Norway - more urban areas
        shelter_levels.append("Bygninger kan gi vindskjerm")
    else:  # Northern/Central Norway
        shelter_levels.append("Naturlig landskap kan gi beskyttelse")
    
    # Determine best seasons based on latitude
    if lat < 60:  # Southern Norway
        best_seasons = ["Vår", "Sommer", "Høst"]
    elif lat < 65:  # Central Norway
        best_seasons = ["Sommer", "Høst"]
    else:  # Northern Norway
        best_seasons = ["Sommer"]  # Best weather in summer
    
    # Calculate drone safety based on wind speed
    drone_safety = "Trygt"
    drone_safety_desc = "Vindforhold er trygge for droneflyvning"
    
    if wind_speed > 0:
        wind_speed_kmh = wind_speed * 3.6
        
        # Drone safety guidelines:
        # - < 20 km/h (5.5 m/s): Trygt for de fleste droner
        # - 20-30 km/h (5.5-8.3 m/s): Vanskelig, kun for erfarne operatører og robuste droner
        # - 30-40 km/h (8.3-11.1 m/s): Farlig, anbefales ikke
        # - > 40 km/h (11.1 m/s): Meget farlig, droneflyvning frarådes
        if wind_speed_kmh < 20:
            drone_safety = "Trygt"
            drone_safety_desc = f"Vindhastighet {wind_speed_kmh:.1f} km/h er trygg for de fleste droner"
        elif wind_speed_kmh < 30:
            drone_safety = "Vanskelig"
            drone_safety_desc = f"Vindhastighet {wind_speed_kmh:.1f} km/h er vanskelig - kun for erfarne operatører og robuste droner"
        elif wind_speed_kmh < 40:
            drone_safety = "Farlig"
            drone_safety_desc = f"Vindhastighet {wind_speed_kmh:.1f} km/h er farlig - droneflyvning anbefales ikke"
        else:
            drone_safety = "Meget farlig"
            drone_safety_desc = f"Vindhastighet {wind_speed_kmh:.1f} km/h er meget farlig - droneflyvning frarådes sterkt"
    else:
        # Fallback if no wind data
        if elevation and elevation.get("elevation", 0) > 200:
            drone_safety = "Vanskelig"
            drone_safety_desc = "Høy høyde kan gi sterkere vind - vær forsiktig"
    
    # Prepare sun exposure data
    sun_data = {
        "windExposure": wind_exposure,
        "sunExposure": sun_exposure,
        "rainShelter": "Delvis" if shelter_levels else "Ingen",
        "bestSeasons": best_seasons,
        "droneSafety": drone_safety,
        "droneSafetyDescription": drone_safety_desc
    }
    
    # Add wind data if available
    if wind_speed > 0:
        sun_data["windSpeed"] = round(wind_speed, 1)
        sun_data["windSpeedKmh"] = round(wind_speed * 3.6, 1)
    if wind_direction is not None:
        sun_data["windDirection"] = round(wind_direction, 0)
    
    # Add sun times if available
    if sun_times.get("sunrise"):
        sun_data["sunrise"] = sun_times["sunrise"]
    if sun_times.get("sunset"):
        sun_data["sunset"] = sun_times["sunset"]
    if sun_times.get("daylight_hours") is not None:
        sun_data["daylightHours"] = sun_times["daylight_hours"]
    if sun_description:
        sun_data["sunDescription"] = sun_description
    
    return WeatherExposure(**sun_data)


@router.get("/luftfartstilsynet/drone-check")
async def check_drone_permission(lat: float, lng: float):
    """
    Check if drone flying is allowed at given coordinates based on Luftfartstilsynet rules.
    Checks:
    - Distance to airports (5 km rule)
    - Restricted zones (R102, etc.)
    - Urban areas
    """
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
    
    restrictions = check_drone_restrictions(lat, lng)
    
    return {
        "allowed": restrictions["allowed"],
        "zone": restrictions["zone"],
        "maxAltitude": restrictions["max_altitude"],
        "requiresPermit": restrictions["requires_permit"],
        "restrictions": restrictions["restrictions"],
        "description": restrictions["description"],
        "nearestAirport": restrictions["nearest_airport"],
        "airportDistanceKm": restrictions["airport_distance_km"],
        "coordinates": {"lat": lat, "lng": lng},
    }


@router.get("/access-analysis")
async def get_access_analysis(
    lat: float,
    lng: float,
    elevation: Optional[float] = None
):
    """
    Analyze access to location based on coordinates.
    Determines parking, public transport, accessibility, and loading zones.
    """
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
    
    elevation_data = {"elevation": elevation or 0, "terrain": "unknown"} if elevation else None
    access_analysis = analyze_access(lat, lng, elevation_data)
    
    return {
        "parking": {
            "type": access_analysis.parking.type,
            "distance": access_analysis.parking.distance,
            "description": access_analysis.parking.description
        },
        "publicTransport": {
            "type": access_analysis.publicTransport.type,
            "distance": access_analysis.publicTransport.distance,
            "description": access_analysis.publicTransport.description
        },
        "accessibility": access_analysis.accessibility,
        "loadingZone": {
            "type": access_analysis.loadingZone.type,
            "distance": access_analysis.loadingZone.distance,
            "description": access_analysis.loadingZone.description
        } if access_analysis.loadingZone else None,
        "evParking": {
            "type": access_analysis.evParking.type,
            "distance": access_analysis.evParking.distance,
            "description": access_analysis.evParking.description
        } if access_analysis.evParking else None,
        "evCharging": {
            "type": access_analysis.evCharging.type,
            "distance": access_analysis.evCharging.distance,
            "description": access_analysis.evCharging.description
        } if access_analysis.evCharging else None,
        "parkingSpots": [
            {
                "name": spot.name,
                "address": spot.address,
                "distance": spot.distance,
                "spaces": spot.spaces,
                "coordinates": {"lat": spot.coordinates.lat, "lng": spot.coordinates.lng}
            }
            for spot in access_analysis.parkingSpots
        ] if access_analysis.parkingSpots else None,
        "evParkingSpots": [
            {
                "name": spot.name,
                "address": spot.address,
                "distance": spot.distance,
                "spaces": spot.spaces,
                "coordinates": {"lat": spot.coordinates.lat, "lng": spot.coordinates.lng}
            }
            for spot in access_analysis.evParkingSpots
        ] if access_analysis.evParkingSpots else None,
        "evChargingSpots": [
            {
                "name": spot.name,
                "address": spot.address,
                "distance": spot.distance,
                "spaces": spot.spaces,
                "coordinates": {"lat": spot.coordinates.lat, "lng": spot.coordinates.lng}
            }
            for spot in access_analysis.evChargingSpots
        ] if access_analysis.evChargingSpots else None,
        "coordinates": {"lat": lat, "lng": lng},
    }


@router.get("/weather-exposure")
async def get_weather_exposure(
    lat: float, 
    lng: float, 
    elevation: Optional[float] = None,
    timeOfDay: Optional[str] = None
):
    """
    Analyze weather exposure based on coordinates and elevation.
    Uses MET Norway API for actual wind data and calculates sun exposure with sunrise/sunset times.
    
    Parameters:
    - lat: Latitude
    - lng: Longitude
    - elevation: Elevation in meters (optional)
    - timeOfDay: Time of day for sun exposure analysis - "morning", "afternoon", or None for auto-detect
    """
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
    
    elevation_data = {"elevation": elevation or 0, "terrain": "unknown"} if elevation else None
    weather_exposure = analyze_weather_exposure(lat, lng, elevation_data, timeOfDay)
    
    return {
        "windExposure": weather_exposure.windExposure,
        "sunExposure": weather_exposure.sunExposure,
        "rainShelter": weather_exposure.rainShelter,
        "bestSeasons": weather_exposure.bestSeasons,
        "sunrise": weather_exposure.sunrise,
        "sunset": weather_exposure.sunset,
        "daylightHours": weather_exposure.daylightHours,
        "sunDescription": weather_exposure.sunDescription,
        "windSpeed": weather_exposure.windSpeed,
        "windSpeedKmh": weather_exposure.windSpeedKmh,
        "windDirection": weather_exposure.windDirection,
        "droneSafety": weather_exposure.droneSafety,
        "droneSafetyDescription": weather_exposure.droneSafetyDescription,
        "coordinates": {"lat": lat, "lng": lng},
    }
