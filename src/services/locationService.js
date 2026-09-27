/* =====================================================
   LOCATION SERVICE (OpenStreetMap — No API Key)
===================================================== */

export function getCurrentCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message = "Unable to get location";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location permission denied. Please allow access.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information unavailable. Check GPS/WiFi.";
            break;
          case error.TIMEOUT:
            message = "Location request timed out. Try again.";
            break;
          default:
            message = "Unknown location error.";
        }

        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

export async function reverseGeocode(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "MediTrack Pharmacy App",
      },
    });

    if (!response.ok) {
      throw new Error("Geocoding service unavailable");
    }

    const data = await response.json();

    if (!data || !data.address) {
      throw new Error("Could not find address for this location");
    }

    const addr = data.address;

    const parts = [
      addr.suburb || addr.neighbourhood || addr.village,
      addr.city || addr.town || addr.county,
    ].filter(Boolean);

    const fullAddress = parts.join(", ");

    return {
      fullAddress: fullAddress || data.display_name,
      displayName: data.display_name,
      city: addr.city || addr.town || addr.county || "",
      state: addr.state || "",
      postcode: addr.postcode || "",
      country: addr.country || "",
      area: addr.suburb || addr.neighbourhood || "",
    };
  } catch (err) {
    console.error("[locationService] Reverse geocode failed:", err);
    throw new Error("Could not determine address. Try again.");
  }
}

export async function detectLocation() {
  try {
    console.log("[locationService] Getting GPS...");
    const coords = await getCurrentCoordinates();
    console.log("[locationService] Coords:", coords);

    console.log("[locationService] Reverse geocoding...");
    const address = await reverseGeocode(coords.latitude, coords.longitude);
    console.log("[locationService] Address:", address);

    return { ...coords, ...address };
  } catch (err) {
    console.error("[locationService] Error:", err);
    throw err;
  }
}