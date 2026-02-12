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

const MARKERS = [
  { lat: 40.6967857, lng: -111.7209817, title: "Winter Gate" },
  { lat: 40.7019681, lng: -111.7025645, title: "Elbow Fork" }, // Combined duplicate
  { lat: 40.6846298, lng: -111.6491335, title: "Big Water Parking Lot" },
  {
    lat: 40.6852596,
    lng: -111.650626,
    title: "End Project Station 258 + 45.95 Mill Creek Canyon Road",
  },
];

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

  const initMap = () => {
    if (mapRef.current && !map) {
      const defaultLocation = { lat: 40.69, lng: -111.68 }; // Centered on markers
      const startLocation = initialLocation || defaultLocation;

      const newMap = new window.google.maps.Map(mapRef.current, {
        center: startLocation,
        zoom: initialLocation ? 15 : 13,
        streetViewControl: false,
        mapTypeControl: false,
        mapTypeId: "hybrid",
        styles: [
          {
            elementType: "geometry",
            stylers: [{ color: "#242f3e" }],
          },
          {
            elementType: "labels.text.stroke",
            stylers: [{ color: "#242f3e" }],
          },
          {
            elementType: "labels.text.fill",
            stylers: [{ color: "#746855" }],
          },
          {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#263c3f" }],
          },
          {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b9a76" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
          },
          {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
          },
          {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca5b3" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }],
          },
          {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f3d19c" }],
          },
          {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#2f3948" }],
          },
          {
            featureType: "transit.station",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#17263c" }],
          },
        ],
      });

      setMap(newMap);

      // Add static markers
      MARKERS.forEach((m) => {
        new window.google.maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map: newMap,
          title: m.title,
          label: {
            text: "📍", // Simple indicator, key info in Hover Title
            color: "white",
            fontSize: "14px",
          },
        });
      });

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
  };

  useEffect(() => {
    // Poll for Google Maps script availability
    const checkGoogleMaps = setInterval(() => {
      if (window.google && window.google.maps) {
        clearInterval(checkGoogleMaps);
        initMap();
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkGoogleMaps);
      if (!window.google) {
        console.error("Google Maps script failed to load within 10 seconds");
      }
    }, 10000);

    return () => {
      clearInterval(checkGoogleMaps);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Re-initialize marker if initialLocation changes (e.g. from parent state update)
    if (initialLocation && map) {
      if (marker) {
        marker.setMap(null);
      }
      const newMarker = new window.google.maps.Marker({
        position: initialLocation,
        map: map,
      });
      setMarker(newMarker);
      map.setCenter(initialLocation);
    }
  }, [initialLocation, map]);

  if (error) {
    return <div className="p-4 bg-red-100 text-red-800 rounded">{error}</div>;
  }

  return (
    <div className="w-full h-64 md:h-96 rounded-lg overflow-hidden border border-gray-300">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
