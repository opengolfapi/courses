'use client';

import { useEffect, useState } from 'react';

interface Poi {
  poi_type: string;
  name: string;
  lat: number;
  lng: number;
  distance_miles: number;
}

interface CourseMapProps {
  lat: number;
  lng: number;
  name: string;
  nearby: Poi[];
}

function CourseMapInner({ lat, lng, name, nearby }: CourseMapProps) {
  const [L, setL] = useState<typeof import('leaflet') | null>(null);

  useEffect(() => {
    import('leaflet').then(mod => {
      setL(mod.default || mod as any);
    });
  }, []);

  useEffect(() => {
    if (!L) return;

    // Fix default icon paths (Leaflet + webpack issue)
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map('course-map').setView([lat, lng], 15);

    // OSM tiles
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    });

    // Satellite tiles (ESRI)
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
      maxZoom: 19,
    });

    osm.addTo(map);
    L.control.layers({ 'Map': osm, 'Satellite': satellite }).addTo(map);

    // Course marker (custom green)
    const courseIcon = L.divIcon({
      html: `<div style="background:#1a472a;border:3px solid white;border-radius:50%;width:20px;height:20px;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    L.marker([lat, lng], { icon: courseIcon })
      .addTo(map)
      .bindPopup(`<strong>${name}</strong>`)
      .openPopup();

    // POI colors
    const poiColors: Record<string, string> = {
      hotel: '#3b82f6',
      lodging: '#3b82f6',
      restaurant: '#f59e0b',
      food: '#f59e0b',
      golf_course: '#16a34a',
      course: '#16a34a',
      driving_range: '#8b5cf6',
    };

    const poiLabels: Record<string, string> = {
      hotel: '🏨',
      lodging: '🏨',
      restaurant: '🍽️',
      food: '🍽️',
      golf_course: '⛳',
      course: '⛳',
      driving_range: '🏌️',
    };

    for (const poi of nearby) {
      if (!poi.lat || !poi.lng) continue;
      const color = poiColors[poi.poi_type] || '#6b7280';
      const emoji = poiLabels[poi.poi_type] || '📍';
      const icon = L.divIcon({
        html: `<div style="background:${color};border:2px solid white;border-radius:50%;width:14px;height:14px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([poi.lat, poi.lng], { icon })
        .addTo(map)
        .bindPopup(`${emoji} <strong>${poi.name}</strong><br>${poi.distance_miles.toFixed(1)} mi away`);
    }

    return () => { map.remove(); };
  }, [L, lat, lng, name, nearby]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div id="course-map" style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden' }} />
    </>
  );
}

export default function CourseMap(props: CourseMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ width: '100%', height: '400px', background: '#f0f0ec', borderRadius: '12px' }} />;
  return <CourseMapInner {...props} />;
}
