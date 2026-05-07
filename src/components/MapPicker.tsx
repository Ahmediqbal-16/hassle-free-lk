"use client";

import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { useCallback, useEffect, useRef, useState } from "react";

const LIBRARIES: ("marker")[] = ["marker"];

interface Props {
  lat: number;
  lng: number;
  onChange?: (lat: number, lng: number) => void;
}

export default function MapPicker({ lat, lng, onChange }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat, lng },
      gmpDraggable: !!onChange,
    });
    markerRef.current = marker;

    if (onChange) {
      marker.addListener("dragend", () => {
        const pos = marker.position as google.maps.LatLngLiteral | google.maps.LatLng;
        if (!pos) return;
        const newLat = typeof (pos as google.maps.LatLng).lat === "function"
          ? (pos as google.maps.LatLng).lat()
          : (pos as google.maps.LatLngLiteral).lat;
        const newLng = typeof (pos as google.maps.LatLng).lng === "function"
          ? (pos as google.maps.LatLng).lng()
          : (pos as google.maps.LatLngLiteral).lng;
        onChange(newLat, newLng);
      });
    }

    return () => { marker.map = null; };
  }, [map, isLoaded]);

  const handleClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!onChange || !e.latLng || !markerRef.current) return;
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      markerRef.current.position = pos;
      onChange(pos.lat, pos.lng);
    },
    [onChange]
  );

  if (!isLoaded) {
    return <div className="w-full h-64 rounded-2xl bg-gray-100 animate-pulse" />;
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-64 rounded-2xl overflow-hidden"
      center={{ lat, lng }}
      zoom={15}
      onLoad={setMap}
      onClick={onChange ? handleClick : undefined}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        mapId: "DEMO_MAP_ID",
      }}
    />
  );
}
