"use client";

import { useEffect, useRef, useState } from "react";

interface Location {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}

export default function LocationPicker({
  onLocationSelect,
  initialLocation,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [map, setMap] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [marker, setMarker] = useState<any>(null);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps script is loaded
    if (!window.google) {
      return;
    }

    if (mapRef.current && !map) {
      const defaultLocation = { lat: 39.8283, lng: -98.5795 }; // Center of USA
      const startLocation = initialLocation || defaultLocation;

      const newMap = new window.google.maps.Map(mapRef.current, {
        center: startLocation,
        zoom: initialLocation ? 15 : 4,
        streetViewControl: false,
        mapTypeControl: false,
      });

      setMap(newMap);

      if (initialLocation) {
        const newMarker = new window.google.maps.Marker({
          position: initialLocation,
          map: newMap,
        });
        setMarker(newMarker);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newMap.addListener("click", (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const selectedLocation = { lat, lng };

        if (marker) {
          marker.setMap(null);
        }

        const newMarker = new window.google.maps.Marker({
          position: selectedLocation,
          map: newMap,
        });
        setMarker(newMarker);
        onLocationSelect(selectedLocation);
      });

      // Try to get current location
      if (navigator.geolocation && !initialLocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            newMap.setCenter(pos);
            newMap.setZoom(15);
          },
          () => {
            // Handle location error if needed, but silent fail is ok here, just stay at default
          }
        );
      }
    }
  }, [map, initialLocation, onLocationSelect, marker]);

  if (error) {
    return <div className="p-4 bg-red-100 text-red-800 rounded">{error}</div>;
  }

  return (
    <div className="w-full h-64 md:h-96 rounded-lg overflow-hidden border border-gray-300">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
