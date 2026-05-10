'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface LocationEditorProps {
  courseId: string;
  courseName: string;
  lat: number;
  lng: number;
}

// Haversine distance in miles
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function LocationEditorMap({
  lat,
  lng,
  onNewPin,
}: {
  lat: number;
  lng: number;
  onNewPin: (newLat: number, newLng: number) => void;
}) {
  const mapId = 'location-editor-map';
  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const newMarkerRef = useRef<import('leaflet').Marker | null>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);

  useEffect(() => {
    import('leaflet').then((mod) => {
      setL(mod.default || (mod as any));
    });
  }, []);

  useEffect(() => {
    if (!L) return;

    // Fix default icon paths
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapId).setView([lat, lng], 15);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Current location pin — red/orange
    const currentIcon = L.divIcon({
      html: `<div style="background:#ea580c;border:3px solid white;border-radius:50%;width:20px;height:20px;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    L.marker([lat, lng], { icon: currentIcon })
      .addTo(map)
      .bindPopup('<strong>Current location</strong>')
      .openPopup();

    // Green icon for suggested location
    const newIcon = L.divIcon({
      html: `<div style="background:#16a34a;border:3px solid white;border-radius:50%;width:20px;height:20px;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    // Click anywhere to place new pin
    map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
      const { lat: newLat, lng: newLng } = e.latlng;

      if (newMarkerRef.current) {
        newMarkerRef.current.setLatLng([newLat, newLng]);
      } else {
        newMarkerRef.current = L.marker([newLat, newLng], { icon: newIcon })
          .addTo(map)
          .bindPopup('<strong>Suggested location</strong>');
        newMarkerRef.current.openPopup();
      }

      onNewPin(newLat, newLng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      newMarkerRef.current = null;
    };
  }, [L, lat, lng, onNewPin]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div
        id={mapId}
        style={{ width: '100%', height: '350px', borderRadius: '10px', overflow: 'hidden', cursor: 'crosshair' }}
      />
    </>
  );
}

export default function LocationEditor({ courseId, courseName, lat, lng }: LocationEditorProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  const [editorEmail, setEditorEmail] = useState('');
  const [editorName, setEditorName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => setMounted(true), []);

  const distance = newLat != null && newLng != null ? haversine(lat, lng, newLat, newLng) : 0;
  const farWarning = distance > 50;

  async function handleSubmit() {
    if (newLat == null || newLng == null) return;
    if (!editorEmail.trim()) {
      setErrorMsg('Email is required.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    const fields: Array<{ field: string; oldVal: string; newVal: string }> = [
      { field: 'latitude', oldVal: String(lat), newVal: String(newLat) },
      { field: 'longitude', oldVal: String(lng), newVal: String(newLng) },
    ];

    for (const { field, oldVal, newVal } of fields) {
      const { data: rpcData, error } = await supabase.rpc('rpc_submit_edit', {
        p_course_id: courseId,
        p_field_name: field,
        p_old_value: oldVal,
        p_new_value: newVal,
        p_editor_email: editorEmail.trim(),
        p_editor_name: editorName.trim(),
      });

      if (error) {
        setErrorMsg(error.message || 'Submission failed. Please try again.');
        setStatus('error');
        return;
      }

      if (rpcData && typeof rpcData === 'object' && 'error' in rpcData) {
        setErrorMsg((rpcData as { error: string }).error);
        setStatus('error');
        return;
      }
    }

    setStatus('success');
  }

  if (!open) {
    return (
      <div className="mt-2">
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-gray-500 hover:text-evergreen-700 underline underline-offset-2"
        >
          Location wrong? Fix it
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="border border-cream-darkest bg-cream-darker rounded-lg p-5 mt-3">
        <p className="text-evergreen-800 text-sm font-medium">
          Thanks! Your location correction is under review.
        </p>
        <button
          onClick={() => { setOpen(false); setStatus('idle'); setNewLat(null); setNewLng(null); }}
          className="text-xs text-evergreen-700 underline mt-2"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 mt-3 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Fix location for {courseName}</h3>
        <button
          onClick={() => { setOpen(false); setStatus('idle'); setNewLat(null); setNewLng(null); }}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close location editor"
        >
          &times;
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Click anywhere on the map to place the correct pin (green). The current location is shown in orange.
      </p>

      {mounted && (
        <LocationEditorMap lat={lat} lng={lng} onNewPin={(newLat, newLng) => { setNewLat(newLat); setNewLng(newLng); }} />
      )}

      {/* Coordinate display */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="bg-orange-50 border border-orange-200 rounded p-2">
          <div className="font-medium text-orange-800 mb-0.5">Current location</div>
          <div className="text-orange-700 font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</div>
        </div>
        <div className={`rounded p-2 border ${newLat != null ? 'bg-cream-darker border-cream-darkest' : 'bg-gray-100 border-gray-200'}`}>
          <div className={`font-medium mb-0.5 ${newLat != null ? 'text-evergreen-800' : 'text-gray-500'}`}>Suggested location</div>
          <div className={`font-mono ${newLat != null ? 'text-evergreen-700' : 'text-gray-400'}`}>
            {newLat != null ? `${newLat.toFixed(6)}, ${newLng!.toFixed(6)}` : 'Click map to set'}
          </div>
        </div>
      </div>

      {/* Distance display */}
      {newLat != null && (
        <div className="mt-1.5 text-xs text-gray-500">
          Distance from current: <span className="font-medium">{distance.toFixed(1)} miles</span>
        </div>
      )}

      {/* Far warning */}
      {farWarning && (
        <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded px-3 py-2 text-yellow-800 text-xs">
          That&apos;s over 50 miles from the current location. Are you sure this is correct?
        </div>
      )}

      {/* Email / name */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Your name (optional)</label>
          <input
            type="text"
            value={editorName}
            onChange={(e) => setEditorName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Your email *</label>
          <input
            type="email"
            value={editorEmail}
            onChange={(e) => setEditorEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white"
          />
        </div>
      </div>

      {status === 'error' && errorMsg && (
        <p className="mt-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">{errorMsg}</p>
      )}

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleSubmit}
          disabled={newLat == null || status === 'submitting'}
          className="bg-evergreen-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-evergreen-900 disabled:opacity-50 transition-colors"
        >
          {status === 'submitting' ? 'Submitting...' : 'Submit Location Fix'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setNewLat(null); setNewLng(null); setStatus('idle'); }}
          className="px-5 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
