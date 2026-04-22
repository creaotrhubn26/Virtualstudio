"""Price administration API routes — extracted from backend/main.py.

Two external-API proxies used by the Price Administration frontend:
  - BRREG (Brønnøysundregistrene): Norwegian company lookup
  - MET Norway: weather forecast for shoot-day planning
"""

from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/price-administration", tags=["price_admin"])

# MET Norway requires a real User-Agent with contact info
_USER_AGENT = "VirtualStudio/1.0 (https://virtualstudio.no; contact@virtualstudio.no)"

# Known Norwegian cities → (lat, lon, display_name)
_CITY_COORDS: dict[str, tuple[float, float, str]] = {
    "oslo": (59.9139, 10.7522, "Oslo"),
    "bergen": (60.3913, 5.3221, "Bergen"),
    "trondheim": (63.4305, 10.3951, "Trondheim"),
    "stavanger": (58.9699, 5.7331, "Stavanger"),
    "tromso": (69.6492, 18.9553, "Tromsø"),
    "tromsoe": (69.6492, 18.9553, "Tromsø"),
    "bodoe": (67.2804, 14.4050, "Bodø"),
    "bodo": (67.2804, 14.4050, "Bodø"),
    "alesund": (62.4722, 6.1549, "Ålesund"),
    "aalesund": (62.4722, 6.1549, "Ålesund"),
    "kristiansand": (58.1467, 7.9956, "Kristiansand"),
    "drammen": (59.7440, 10.2045, "Drammen"),
    "fredrikstad": (59.2181, 10.9298, "Fredrikstad"),
    "skien": (59.2089, 9.6096, "Skien"),
    "sandnes": (58.8526, 5.7333, "Sandnes"),
    "sandefjord": (59.1282, 10.2197, "Sandefjord"),
    "sarpsborg": (59.2836, 11.1096, "Sarpsborg"),
    "arendal": (58.4614, 8.7725, "Arendal"),
    "haugesund": (59.4136, 5.2680, "Haugesund"),
    "tonsberg": (59.2676, 10.4076, "Tønsberg"),
    "porsgrunn": (59.1405, 9.6561, "Porsgrunn"),
    "hamar": (60.7945, 11.0680, "Hamar"),
    "harstad": (68.7986, 16.5416, "Harstad"),
    "larvik": (59.0533, 10.0353, "Larvik"),
    "halden": (59.1242, 11.3879, "Halden"),
    "lillehammer": (61.1151, 10.4662, "Lillehammer"),
    "moelv": (60.9333, 10.7000, "Moelv"),
    "mo i rana": (66.3128, 14.1428, "Mo i Rana"),
    "kristiansund": (63.1110, 7.7280, "Kristiansund"),
    "kongsberg": (59.6689, 9.6500, "Kongsberg"),
    "honefoss": (60.1682, 10.2565, "Hønefoss"),
    "honnefoss": (60.1682, 10.2565, "Hønefoss"),
}


@router.get("/brreg/companies/search")
async def search_brreg_companies(name: str, limit: int = 10):
    """Search BRREG (Brønnøysundregistrene) for companies by name."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://data.brreg.no/enhetsregisteret/api/enheter",
                params={"navn": name, "size": min(limit, 100)},
            )

        if response.status_code != 200:
            return JSONResponse(
                {
                    "success": False,
                    "error": f"BRREG API returned status {response.status_code}",
                    "data": {
                        "companies": [],
                        "total": 0,
                        "searchTerm": name,
                        "source": "fallback",
                        "lastUpdated": datetime.utcnow().isoformat() + "Z",
                    },
                },
                status_code=response.status_code,
            )

        data = response.json()
        enheter = data.get("_embedded", {}).get("enheter", [])
        companies = []
        for enhet in enheter:
            forretningsadresse = enhet.get("forretningsadresse", {})
            adresse_lines = forretningsadresse.get("adresse", [])
            companies.append(
                {
                    "organizationNumber": enhet.get("organisasjonsnummer", ""),
                    "name": enhet.get("navn", ""),
                    "organizationForm": enhet.get("organisasjonsform", {}).get("kode", ""),
                    "registrationDate": enhet.get("stiftelsesdato", ""),
                    "businessAddress": {
                        "adresse": ", ".join(adresse_lines) if adresse_lines else "",
                        "postnummer": forretningsadresse.get("postnummer", ""),
                        "poststed": forretningsadresse.get("poststed", ""),
                    },
                    "industry": enhet.get("naeringskode1", {}).get("beskrivelse", ""),
                    "employees": None,
                }
            )

        return JSONResponse(
            {
                "success": True,
                "data": {
                    "companies": companies,
                    "total": data.get("page", {}).get("totalElements", 0),
                    "searchTerm": name,
                    "source": "brreg_api",
                    "lastUpdated": datetime.utcnow().isoformat() + "Z",
                },
            }
        )

    except httpx.TimeoutException:
        return JSONResponse(
            {
                "success": False,
                "error": "Request to BRREG API timed out",
                "data": {
                    "companies": [],
                    "total": 0,
                    "searchTerm": name,
                    "source": "fallback",
                    "lastUpdated": datetime.utcnow().isoformat() + "Z",
                },
            },
            status_code=504,
        )
    except Exception as e:
        return JSONResponse(
            {
                "success": False,
                "error": str(e),
                "data": {
                    "companies": [],
                    "total": 0,
                    "searchTerm": name,
                    "source": "fallback",
                    "lastUpdated": datetime.utcnow().isoformat() + "Z",
                },
            },
            status_code=500,
        )


@router.get("/brreg/company/{organization_number}")
async def get_brreg_company(organization_number: str):
    """Get company details from BRREG by organization number."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://data.brreg.no/enhetsregisteret/api/enheter/{organization_number}"
            )

        if response.status_code == 404:
            return JSONResponse(
                {"success": False, "error": "Company not found", "data": None},
                status_code=404,
            )
        if response.status_code != 200:
            return JSONResponse(
                {
                    "success": False,
                    "error": f"BRREG API returned status {response.status_code}",
                    "data": None,
                },
                status_code=response.status_code,
            )

        enhet = response.json()
        forretningsadresse = enhet.get("forretningsadresse", {})
        adresse_lines = forretningsadresse.get("adresse", [])

        postadresse = enhet.get("postadresse", {})
        mailing_address = None
        if postadresse:
            mailing_adresse_lines = postadresse.get("adresse", [])
            mailing_address = {
                "adresse": ", ".join(mailing_adresse_lines) if mailing_adresse_lines else "",
                "postnummer": postadresse.get("postnummer", ""),
                "poststed": postadresse.get("poststed", ""),
            }

        company_data = {
            "organizationNumber": enhet.get("organisasjonsnummer", organization_number),
            "name": enhet.get("navn", ""),
            "organizationForm": enhet.get("organisasjonsform", {}).get("kode", ""),
            "registrationDate": enhet.get("stiftelsesdato", ""),
            "businessAddress": {
                "adresse": ", ".join(adresse_lines) if adresse_lines else "",
                "postnummer": forretningsadresse.get("postnummer", ""),
                "poststed": forretningsadresse.get("poststed", ""),
            },
            "industry": enhet.get("naeringskode1", {}).get("beskrivelse", ""),
            "employees": None,
            "website": None,
            "source": "brreg_api",
            "lastUpdated": datetime.utcnow().isoformat() + "Z",
        }
        if mailing_address:
            company_data["mailingAddress"] = mailing_address

        return JSONResponse({"success": True, "data": company_data})

    except httpx.TimeoutException:
        return JSONResponse(
            {"success": False, "error": "Request to BRREG API timed out", "data": None},
            status_code=504,
        )
    except Exception as e:
        return JSONResponse(
            {"success": False, "error": str(e), "data": None}, status_code=500
        )


@router.get("/weather/forecast/{location}")
async def get_weather_forecast(
    location: str,
    lat: float = Query(None, description="Latitude in decimal degrees"),
    lon: float = Query(None, description="Longitude in decimal degrees"),
    days: int = Query(5, description="Number of days to forecast (default: 5)"),
):
    """Weather forecast via MET Norway Locationforecast 2.0.

    Either ``lat``+``lon`` OR a recognised Norwegian city name in ``location``.
    """
    try:
        # Resolve coordinates
        if lat is not None and lon is not None:
            if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                return JSONResponse(
                    {
                        "success": False,
                        "error": "Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180",
                        "data": None,
                    },
                    status_code=400,
                )
            if not (57 <= lat <= 72) or not (4 <= lon <= 32):
                return JSONResponse(
                    {
                        "success": False,
                        "error": (
                            f"Coordinates ({lat}, {lon}) are outside Norwegian territory. "
                            "Please provide coordinates within Norway (approximately lat: 57-72, lon: 4-32)"
                        ),
                        "data": None,
                    },
                    status_code=400,
                )
            latitude, longitude = lat, lon
            location_name = location
        else:
            loc = _CITY_COORDS.get(location.lower().strip())
            if not loc:
                return JSONResponse(
                    {
                        "success": False,
                        "error": (
                            f"Location '{location}' not recognized. Please provide coordinates (lat/lon) "
                            "or use a recognized Norwegian city name. Supported cities: Oslo, Bergen, "
                            "Trondheim, Stavanger, Tromsø, Bodø, Ålesund, Kristiansand, and others."
                        ),
                        "data": None,
                        "suggestion": "Provide lat and lon query parameters, or use a recognized city name",
                    },
                    status_code=404,
                )
            latitude, longitude, location_name = loc

        forecast_days = min(max(1, days), 10)

        async with httpx.AsyncClient(
            timeout=10.0, headers={"User-Agent": _USER_AGENT}
        ) as client:
            response = await client.get(
                "https://api.met.no/weatherapi/locationforecast/2.0/compact",
                params={"lat": latitude, "lon": longitude},
            )

        if response.status_code != 200:
            return JSONResponse(
                {
                    "success": False,
                    "error": f"MET Norway API returned status {response.status_code}",
                    "data": None,
                },
                status_code=response.status_code,
            )

        data = response.json()
        timeseries = data.get("properties", {}).get("timeseries", [])

        today = datetime.utcnow().replace(hour=12, minute=0, second=0, microsecond=0)
        target_dates: dict = {
            (today + timedelta(days=d)).date(): [] for d in range(forecast_days)
        }

        # Group by date, keep entries near noon
        for entry in timeseries:
            entry_time = datetime.fromisoformat(entry["time"].replace("Z", "+00:00"))
            entry_date = entry_time.date()
            if entry_date in target_dates and 11 <= entry_time.hour <= 13:
                target_dates[entry_date].append(
                    {"time": entry_time, "data": entry.get("data", {})}
                )

        forecast = []
        for d in range(forecast_days):
            forecast_date = (today + timedelta(days=d)).date()
            day_entries = target_dates.get(forecast_date, [])
            if day_entries:
                closest = min(day_entries, key=lambda e: abs(e["time"].hour - 12))
                instant = closest["data"].get("instant", {}).get("details", {})
                next_1h = closest["data"].get("next_1_hours", {}).get("details", {})
                summary = (
                    closest["data"].get("next_1_hours", {}).get("summary", {}).get("symbol_code", "clearsky_day")
                )
                if "cloud" in summary:
                    symbol = "cloud"
                elif "rain" in summary or "shower" in summary:
                    symbol = "rain"
                elif "snow" in summary or "sleet" in summary:
                    symbol = "snow"
                else:
                    symbol = "sun"
                forecast.append(
                    {
                        "date": forecast_date.isoformat(),
                        "temperature": round(instant.get("air_temperature", 10), 1),
                        "humidity": round(instant.get("relative_humidity", 60), 1),
                        "windSpeed": round(instant.get("wind_speed", 5), 1),
                        "precipitation": round(next_1h.get("precipitation_amount", 0), 1),
                        "symbol": symbol,
                    }
                )
            else:
                forecast.append(
                    {
                        "date": forecast_date.isoformat(),
                        "temperature": 10.0,
                        "humidity": 60.0,
                        "windSpeed": 5.0,
                        "precipitation": 0.0,
                        "symbol": "cloud",
                    }
                )

        return JSONResponse(
            {
                "success": True,
                "data": {
                    "location": location_name,
                    "forecast": forecast,
                    "days": forecast_days,
                    "coordinates": {"lat": latitude, "lon": longitude},
                    "source": "met_no",
                    "lastUpdated": datetime.utcnow().isoformat() + "Z",
                },
            }
        )

    except httpx.TimeoutException:
        return JSONResponse(
            {"success": False, "error": "Request to MET Norway API timed out", "data": None},
            status_code=504,
        )
    except Exception as e:
        import traceback

        traceback.print_exc()
        return JSONResponse(
            {"success": False, "error": str(e), "data": None}, status_code=500
        )
