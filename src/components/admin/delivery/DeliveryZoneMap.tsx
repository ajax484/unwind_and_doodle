'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import { AdminDeliveryZoneItem, AdminWarehouseListItem } from '@/types/admin-inventory';

interface DeliveryZoneMapProps {
  warehouse: AdminWarehouseListItem | null;
  zones: AdminDeliveryZoneItem[];
  selectedZoneId?: string | null;
  onSelectZone?: (zone: AdminDeliveryZoneItem) => void;
  onEditZone?: (zone: AdminDeliveryZoneItem) => void;
  className?: string;
}

// Coordinate lookup for Nigerian regions, states, and districts
const NIGERIAN_COORDINATES: Record<string, [number, number]> = {
  // States & Cities
  lagos: [6.5244, 3.3792],
  abuja: [9.0579, 7.4951],
  fct: [9.0579, 7.4951],
  'fct abuja': [9.0579, 7.4951],
  rivers: [4.8156, 7.0498],
  'port harcourt': [4.8156, 7.0498],
  oyo: [7.3775, 3.947],
  ibadan: [7.3775, 3.947],
  kano: [12.0022, 8.592],
  enugu: [6.4584, 7.5464],
  edo: [6.335, 5.6037],
  'benin city': [6.335, 5.6037],
  ogun: [7.1475, 3.3619],
  abeokuta: [7.1475, 3.3619],

  // Lagos Districts & LGAs
  ikeja: [6.6018, 3.3515],
  'victoria island': [6.4281, 3.4219],
  vi: [6.4281, 3.4219],
  lekki: [6.4698, 3.5852],
  'lekki phase 1': [6.4474, 3.4731],
  ajah: [6.4667, 3.5667],
  yaba: [6.5095, 3.3711],
  surulere: [6.4975, 3.3578],
  gbagada: [6.5569, 3.3871],
  maryland: [6.5727, 3.3644],
  ikoyi: [6.4549, 3.4246],
  ikorodu: [6.6194, 3.5105],
  festac: [6.4667, 3.2833],
  alaba: [6.4619, 3.1931],
  magodo: [6.6214, 3.3817],
  ojota: [6.5861, 3.3853],
  oshodi: [6.5381, 3.3422],
  agege: [6.618, 3.3209],
  'eti-osa': [6.4389, 3.5042],
  apapa: [6.4481, 3.3598],

  // Abuja Districts
  garki: [9.03, 7.485],
  'garki area 1': [9.032, 7.488],
  wuse: [9.0667, 7.4667],
  'wuse 2': [9.075, 7.472],
  'wuse ii': [9.075, 7.472],
  maitama: [9.0882, 7.4985],
  asokoro: [9.0433, 7.5256],
  gwarinpa: [9.1084, 7.3912],
  jabi: [9.0765, 7.4253],
  utako: [9.061, 7.441],
  kubwa: [9.1539, 7.3328],
  lugbe: [8.9752, 7.3686],
  apo: [9.0069, 7.5022],
  guzape: [9.025, 7.531],
};

function resolveCoordinates(
  name: string,
  state?: string | null,
  fallbackBase: [number, number] = [6.5244, 3.3792],
  seedIndex: number = 0
): [number, number] {
  const normName = name.toLowerCase().trim();
  const normState = (state || '').toLowerCase().trim();

  if (NIGERIAN_COORDINATES[normName]) {
    return NIGERIAN_COORDINATES[normName];
  }

  // Try matching state center if known
  let base = fallbackBase;
  if (NIGERIAN_COORDINATES[normState]) {
    base = NIGERIAN_COORDINATES[normState];
  }

  // Deterministic radial jitter around base coordinates based on name string
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const angle = (Math.abs(hash + seedIndex * 53) % 360) * (Math.PI / 180);
  const distance = 0.015 + ((Math.abs(hash) % 40) / 1000); // ~1.5 to 5 km offset

  return [base[0] + distance * Math.cos(angle), base[1] + distance * Math.sin(angle)];
}

interface LeafletWindow extends Window {
  L?: {
    map: (el: HTMLElement | string, options?: unknown) => LeafletMapInstance;
    tileLayer: (url: string, options?: unknown) => { addTo: (map: LeafletMapInstance) => void };
    divIcon: (options: { className?: string; html: string; iconSize?: [number, number]; iconAnchor?: [number, number] }) => unknown;
    marker: (latlng: [number, number], options?: unknown) => LeafletMarkerInstance;
    featureGroup: (markers: unknown[]) => { getBounds: () => unknown; addTo: (map: LeafletMapInstance) => void };
  };
}

interface LeafletMapInstance {
  remove: () => void;
  setView: (latlng: [number, number], zoom: number) => void;
  fitBounds: (bounds: unknown, options?: unknown) => void;
}

interface LeafletMarkerInstance {
  addTo: (map: LeafletMapInstance) => LeafletMarkerInstance;
  bindPopup: (content: string) => LeafletMarkerInstance;
  on: (event: string, fn: () => void) => LeafletMarkerInstance;
}

export default function DeliveryZoneMap({
  warehouse,
  zones,
  selectedZoneId,
  onSelectZone,
  onEditZone,
  className = '',
}: DeliveryZoneMapProps) {
  const mapContainerId = useId().replace(/:/g, '-');
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  // Warehouse origin coordinate
  const defaultBaseCoord: [number, number] = [6.5244, 3.3792];
  const warehouseCoord: [number, number] = warehouse
    ? resolveCoordinates(warehouse.name, warehouse.state, defaultBaseCoord)
    : defaultBaseCoord;

  // Dynamic Leaflet CSS and JS Injection
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const lWin = window as unknown as LeafletWindow;

    const initLeaflet = () => {
      if (lWin.L) {
        setMapLoaded(true);
        return;
      }

      // Check if stylesheet already present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Check if script already present
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => {
          setMapLoaded(true);
        };
        script.onerror = () => {
          setMapFailed(true);
        };
        document.body.appendChild(script);
      } else {
        // Script tag exists, wait for L to be ready
        const checkL = setInterval(() => {
          if (lWin.L) {
            clearInterval(checkL);
            setMapLoaded(true);
          }
        }, 100);
      }
    };

    try {
      initLeaflet();
      // Timeout fallback to SVG topology after 4 seconds
      timeoutId = setTimeout(() => {
        if (!lWin.L) {
          setMapFailed(true);
        }
      }, 4000);
    } catch {
      setMapFailed(true);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Initialize and Render Map Markers
  useEffect(() => {
    const lWin = window as unknown as LeafletWindow;
    const leaflet = lWin.L;
    if (!mapLoaded || mapFailed || !leaflet) return;

    const el = document.getElementById(mapContainerId);
    if (!el) return;

    // Clean up previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = leaflet.map(el, {
        zoomControl: true,
        attributionControl: false,
      });

      map.setView(warehouseCoord, 12);

      leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      const markers: unknown[] = [];

      // 1. Warehouse Marker
      if (warehouse) {
        const whIcon = leaflet.divIcon({
          className: 'custom-wh-marker',
          html: `
            <div style="transform: translate(-50%, -100%);" class="flex flex-col items-center pointer-events-auto">
              <div class="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-bold text-[11px] shadow-lg flex items-center gap-1.5 whitespace-nowrap border border-slate-700">
                <span class="text-amber-400">🏬</span>
                <span>${warehouse.name}</span>
              </div>
              <div class="w-3 h-3 bg-slate-900 rotate-45 -mt-1.5 border-r border-b border-slate-700"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/30 animate-ping -mt-1"></div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const whMarker = leaflet.marker(warehouseCoord, { icon: whIcon }).addTo(map);
        whMarker.bindPopup(`
          <div class="p-2 text-xs font-sans">
            <div class="font-bold text-slate-900">${warehouse.name}</div>
            <div class="text-slate-500 text-[10px] mt-0.5">${warehouse.state || 'Hub'}</div>
            <div class="text-[10px] text-emerald-600 font-semibold mt-1">Origin Fulfillment Warehouse</div>
          </div>
        `);
        markers.push(whMarker);
      }

      // 2. Delivery Zones Markers
      zones.forEach((zone, idx) => {
        const coord = resolveCoordinates(
          zone.locationName,
          zone.locationState,
          warehouseCoord,
          idx + 1
        );

        const isSelected = selectedZoneId === zone.id || selectedZoneId === zone.locationId;
        const feeFormatted = new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
          maximumFractionDigits: 0,
        }).format(zone.price);

        const zoneIcon = leaflet.divIcon({
          className: 'custom-zone-marker',
          html: `
            <div style="transform: translate(-50%, -100%);" class="flex flex-col items-center cursor-pointer pointer-events-auto transition-transform hover:scale-105">
              <div class="px-2.5 py-1 rounded-xl ${
                isSelected
                  ? 'bg-rose-600 text-white ring-2 ring-rose-300'
                  : zone.active
                  ? 'bg-white text-slate-800 border border-slate-200'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              } font-bold text-[10px] shadow-md flex items-center gap-1.5 whitespace-nowrap">
                <span class="${zone.active ? 'text-rose-500' : 'text-slate-400'}">📍</span>
                <span>${zone.locationName}</span>
                <span class="font-mono ${isSelected ? 'text-rose-100' : 'text-rose-600 font-bold'}">${feeFormatted}</span>
              </div>
              <div class="w-2 h-2 ${
                isSelected ? 'bg-rose-600' : 'bg-white border-r border-b border-slate-200'
              } rotate-45 -mt-1"></div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const zoneMarker = leaflet.marker(coord, { icon: zoneIcon }).addTo(map);

        zoneMarker.on('click', () => {
          if (onSelectZone) onSelectZone(zone);
        });

        zoneMarker.bindPopup(`
          <div class="p-2 text-xs font-sans space-y-1">
            <div class="font-bold text-slate-900">${zone.locationName}</div>
            <div class="text-[11px] text-slate-500">${zone.locationState} ${zone.locationLga ? `• ${zone.locationLga}` : ''}</div>
            <div class="font-bold text-rose-600 text-xs mt-1">Delivery Fee: ${feeFormatted}</div>
            <div class="text-[10px] text-slate-400">${zone.active ? '● Active in checkout' : '○ Disabled'}</div>
          </div>
        `);

        markers.push(zoneMarker);
      });

      // Fit bounds if markers exist
      if (markers.length > 1) {
        const group = leaflet.featureGroup(markers);
        map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 13 });
      }

      mapInstanceRef.current = map;
    } catch (err) {
      console.warn('Leaflet map initialization error, switching to topology view:', err);
      setMapFailed(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapLoaded, mapFailed, mapContainerId, warehouse, zones, selectedZoneId, onSelectZone, onEditZone]);

  // Visual Topology Fallback (Resilient pure-SVG radar when Leaflet fails or tiles are blocked)
  if (mapFailed) {
    return (
      <div
        className={`relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 flex flex-col justify-between ${className}`}
        style={{ minHeight: '380px' }}
      >
        {/* Header Notice */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-200">
              Delivery Topology Radar
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {zones.length} zones served
          </span>
        </div>

        {/* SVG Graphic with Hub & Radial Connected Zones */}
        <div className="relative my-auto flex items-center justify-center py-6">
          <svg className="w-full max-w-sm h-64 overflow-visible" viewBox="-150 -150 300 300">
            {/* Concentric distance rings */}
            <circle cx="0" cy="0" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <circle cx="0" cy="0" r="90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="0" cy="0" r="135" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

            {/* Hub Radar Sweep */}
            <circle cx="0" cy="0" r="140" fill="rgba(244, 63, 94, 0.02)" />

            {/* Zone Connectors & Satellites */}
            {zones.slice(0, 10).map((z, i) => {
              const angle = (i * (360 / Math.min(zones.length, 10)) - 90) * (Math.PI / 180);
              const dist = 75 + (i % 3) * 28;
              const x = Math.round(dist * Math.cos(angle));
              const y = Math.round(dist * Math.sin(angle));
              const isSelected = selectedZoneId === z.id || selectedZoneId === z.locationId;

              return (
                <g key={z.id} className="cursor-pointer" onClick={() => onSelectZone && onSelectZone(z)}>
                  <line x1="0" y1="0" x2={x} y2={y} stroke={isSelected ? '#f43f5e' : 'rgba(255,255,255,0.15)'} strokeWidth="1.5" strokeDasharray={z.active ? 'none' : '2 2'} />
                  <circle cx={x} cy={y} r={isSelected ? 6 : 4.5} fill={isSelected ? '#f43f5e' : z.active ? '#fb7185' : '#64748b'} stroke="#0f172a" strokeWidth="1.5" />
                  <text
                    x={x > 0 ? x + 8 : x - 8}
                    y={y + 3}
                    textAnchor={x > 0 ? 'start' : 'end'}
                    fill={isSelected ? '#ffffff' : '#cbd5e1'}
                    fontSize="9"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                  >
                    {z.locationName} (₦{z.price.toLocaleString()})
                  </text>
                </g>
              );
            })}

            {/* Center Warehouse Hub */}
            <circle cx="0" cy="0" r="22" fill="#e11d48" className="shadow-lg" />
            <circle cx="0" cy="0" r="28" fill="none" stroke="#f43f5e" strokeWidth="1" opacity="0.5" />
            <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="13">🏬</text>
          </svg>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800 z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-rose-400 font-bold">● Hub:</span>
            <span>{warehouse?.name || 'Central Warehouse'}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMapFailed(false);
              setMapLoaded(false);
            }}
            className="text-xs text-rose-400 hover:text-rose-300 underline font-semibold"
          >
            Retry Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-200/80 shadow-xs bg-slate-50 ${className}`}>
      {/* Map Element */}
      <div id={mapContainerId} className="w-full h-full min-h-[360px] z-0" />

      {/* Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-slate-100/90 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 z-10">
          <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Loading delivery map...</p>
        </div>
      )}

      {/* Map Legend Overlay */}
      {mapLoaded && (
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 text-[10px] text-slate-600">
          <div className="flex items-center gap-1">
            <span className="text-amber-500">🏬</span>
            <span className="font-semibold">Warehouse Hub</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Delivery Zone</span>
          </div>
        </div>
      )}
    </div>
  );
}
