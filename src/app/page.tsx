'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, BarChart3, Newspaper, Search, X, Globe, MapPinned, Route, Radar, Satellite, Moon, ExternalLink, AlertTriangle, Activity, Database, Wifi, Play, Network, Crosshair, Bluetooth, Pentagon, Radio , PenLine, ShoppingBag } from 'lucide-react';
import { type TerrainStatus } from '@/lib/map-terrain';
import { loadCameraCatalog, mergeCameraCatalog } from '@/lib/camera-catalog';
import IntelFeed from '@/components/IntelFeed';
import MarketsPanel from '@/components/MarketsPanel';
import ScmPanel from '@/components/ScmPanel';
import SearchBar from '@/components/SearchBar';
import DirectionsBar, { type RouteResult, type LiveLocation } from '@/components/DirectionsBar';
import NavigationView from '@/components/NavigationView';
import FlightWatchPanel, { type WatchedFlight, type FlightTelemetry, type AircraftDetail, type Airport } from '@/components/FlightWatchPanel';
import type { NavProgress } from '@/lib/navigation';
import type { LiveDetection } from '@/lib/malware-intel';
import ScaleBar from '@/components/ScaleBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { applySettings, loadSavedSettings } from '@/lib/style-tokens';
import SharePanel from '@/components/SharePanel';
import ViewPresets from '@/components/ViewPresets';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import GlobalStatusBar from '@/components/GlobalStatusBar';
import LiveAlerts from '@/components/LiveAlerts';
import WorldRemote from '@/components/WorldRemote';
import ArcGISPanel from '@/components/ArcGISPanel';

const AxissMap = dynamic(() => import('@/components/OsirisMap'), { ssr: false });
const LayerPanel = dynamic(() => import('@/components/LayerPanel'));
const SpaceCam = dynamic(() => import('@/components/SpaceCam'), { ssr: false });
const CameraViewer = dynamic(() => import('@/components/CameraViewer'));
const OsintPanel = dynamic(() => import('@/components/OsintPanel'));
const DrawingToolbar = dynamic(() => import('@/components/DrawingToolbar'), { ssr: false });
const DrawHud = dynamic(() => import('@/components/DrawHud'), { ssr: false });
import { toShape, queryRing, type DrawMode, type DrawnShape, type DrawProgress, type DrawResult } from '@/lib/draw';
import { selectInPolygon } from '@/lib/aoi';
import { diffSweep, appendEvents, type WatchBaseline, type WatchEvent } from '@/lib/watch';
import { STORAGE_KEY, serializeShapes, deserializeShapes, shapesToGeoJSON, downloadFile } from '@/lib/aoi-export';
const TokenPanel = dynamic(() => import('@/components/TokenPanel'));

// ── KENYA & EAST AFRICA INTEL INJECTION ──
const KENYA_CCTV_FEEDS = [
  { id: 'ke-cam-nairobi-1', type: 'cctv', name: 'Nairobi CBD Traffic', lat: -1.2864, lng: 36.8172, url: 'https://www.youtube.com/embed/jfKfPFYJRfg', embed_allowed: true },
  { id: 'ke-cam-mombasa-1', type: 'cctv', name: 'Mombasa Nyali Cam', lat: -4.0500, lng: 39.7000, url: 'https://www.youtube.com/embed/jfKfPFYJRfg', embed_allowed: true },
  { id: 'ke-cam-nakuru-1', type: 'cctv', name: 'Nakuru Town', lat: -0.3031, lng: 36.0800, url: 'https://www.youtube.com/embed/jfKfPFYJRfg', embed_allowed: true },
  { id: 'ke-cam-kisumu-1', type: 'cctv', name: 'Kisumu Port', lat: -0.0917, lng: 34.7680, url: 'https://www.youtube.com/embed/jfKfPFYJRfg', embed_allowed: true },
  { id: 'tz-cam-dar-1', type: 'cctv', name: 'Dar es Salaam Port', lat: -6.8235, lng: 39.2695, url: 'https://www.youtube.com/embed/jfKfPFYJRfg', embed_allowed: true },
  { id: 'ug-cam-kla-1', type: 'cctv', name: 'Kampala City Cam', lat: 0.3476, lng: 32.5825, url: 'https://www.youtube.com/embed/jfKfPFYJRfg', embed_allowed: true },
];

const KENYA_WEATHER_EVENTS = [
  { id: 'ke-wx-1', type: 'weather', lat: -1.2864, lng: 36.8172, event: 'Heavy Rain', severity: 'moderate', area: 'Nairobi' },
  { id: 'ke-wx-2', type: 'weather', lat: -0.0917, lng: 34.7680, event: 'Thunderstorm Warning', severity: 'severe', area: 'Kisumu / Lake Victoria' },
  { id: 'ke-wx-3', type: 'weather', lat: -0.3031, lng: 36.0800, event: 'High Winds', severity: 'moderate', area: 'Nakuru / Rift Valley' },
  { id: 'tz-wx-1', type: 'weather', lat: -6.8235, lng: 39.2695, event: 'Coastal Flooding', severity: 'severe', area: 'Dar es Salaam' },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobile(w < 768 || (h < 500 && w < 1024));
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  return isMobile;
}

const UptimeClock = () => {
  const [uptime, setUptime] = useState('00:00:00');
  const startTime = useRef(0);
  if (startTime.current === 0) startTime.current = Date.now();
  useEffect(() => {
    const iv = setInterval(() => {
      const e = Math.floor((Date.now() - startTime.current) / 1000);
      setUptime(`${String(Math.floor(e/3600)).padStart(2,'0')}:${String(Math.floor((e%3600)/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="hidden lg:inline">UPTIME: <span className="text-[var(--gold-primary)]">{uptime}</span></span>;
};

const ZuluClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      setTime(`ZULU ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}Z`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="text-[var(--cyan-primary)] font-bold tabular-nums">{time || 'ZULU --:--:--Z'}</span>;
};

const ActiveEntityCount = ({ data }: { data: Record<string, unknown[]> }) => {
  const count = useMemo(() => {
    if (!data) return 0;
    return Object.values(data).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 0), 0);
  }, [data]);
  return <span className="text-[var(--alert-green)] font-bold tabular-nums">{count.toLocaleString()}</span>;
};

function getYouTubeWatchUrl(url: string): string {
  if (url.includes('channel=')) return `https://www.youtube.com/channel/${url.split('channel=')[1].split('&')[0]}/live`;
  if (url.includes('/embed/')) return `https://www.youtube.com/watch?v=${url.split('/embed/')[1].split('?')[0]}`;
  return url;
}

function ViewSegment({ active, onClick, title, icon: Icon, label, layoutId }: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  layoutId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono font-medium tracking-[0.18em] transition-colors duration-200 ${
        active ? 'text-[var(--gold-light)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-md border border-[var(--border-active)] bg-[var(--gold-primary)]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_14px_var(--gold-glow)]"
        />
      )}
      <Icon className="w-3.5 h-3.5 relative z-10" />
      <span className="hidden md:inline relative z-10">{label}</span>
    </button>
  );
}

const newsTransform = (d: { news?: unknown[]; sources?: unknown[]; timestamp?: string }) => ({
  news: d.news,
  news_meta: { sources: d.sources ?? [], fetchedAt: d.timestamp ?? null },
});

export default function Dashboard() {
  const dataRef = useRef<any>({});
  const [dataVersion, setDataVersion] = useState(0);
  const data = dataRef.current;

  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [mapView, setMapView] = useState({ zoom: 2.5, latitude: 20 });
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number; ts: number } | null>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const mouseCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const coordsDisplayRef = useRef<HTMLDivElement>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [regionDossier, setRegionDossier] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const autoLocateCancelled = useRef(false);

  const [activeCamera, setActiveCamera] = useState<any>(null);
  const [spaceWeather, setSpaceWeather] = useState<any>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [showMarkets, setShowMarkets] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showSpaceCam, setShowSpaceCam] = useState(false);
  const [showScmPanel, setShowScmPanel] = useState(true);
  const [showIntel, setShowIntel] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode | null>(null);
  const [drawProgress, setDrawProgress] = useState<DrawProgress | null>(null);
  const [drawCommand, setDrawCommand] = useState<{ action: 'undo' | 'finish' | 'cancel'; seq: number } | null>(null);
  const sendDraw = useCallback((action: 'undo' | 'finish' | 'cancel') => {
    setDrawCommand(c => ({ action, seq: (c?.seq ?? 0) + 1 }));
  }, []);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [watchEvents, setWatchEvents] = useState<WatchEvent[]>([]);
  const watchBaselines = useRef<Record<string, WatchBaseline>>({});
  const [selectedPolygon, setSelectedPolygon] = useState<string | null>(null);
  const [showDesktopSearch, setShowDesktopSearch] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [activeRoute, setActiveRoute] = useState<
    (RouteResult & {
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
      alternates?: Array<{ type: 'LineString'; coordinates: [number, number][] }>;
      activeSegment?: [number, number][] | null;
    }) | null
  >(null);
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null);
  const [followUser, setFollowUser] = useState(false);
  const [navSession, setNavSession] = useState<{ route: RouteResult; label: string; key: number } | null>(null);
  const [navProgress, setNavProgress] = useState<NavProgress | null>(null);
  const [watchedFlights, setWatchedFlights] = useState<WatchedFlight[]>([]);
  const [aircraftAirports, setAircraftAirports] = useState<Record<string, Airport[]>>({});

  useEffect(() => {
    (window as unknown as { axissWatchFlight?: (f: WatchedFlight) => void }).axissWatchFlight = (f) => {
      if (!f?.icao24) return;
      setWatchedFlights((prev) => prev.some((w) => w.icao24 === f.icao24) ? prev : [...prev, f].slice(-6));
    };
  }, []);

  const removeWatched = useCallback((icao24: string) => {
    setWatchedFlights((prev) => prev.filter((w) => w.icao24 !== icao24));
    setAircraftAirports((prev) => {
      const next = { ...prev };
      delete next[icao24];
      return next;
    });
  }, []);

  const handleAircraftDetail = useCallback((icao24: string, detail: AircraftDetail | null) => {
    const ports = [detail?.origin, detail?.destination]
      .filter((a): a is Airport => Boolean(a && Number.isFinite(a.lat) && Number.isFinite(a.lng)));
    setAircraftAirports((prev) => (ports.length ? { ...prev, [icao24]: ports } : prev));
  }, []);

  const watchTelemetry = useMemo(() => {
    const out: Record<string, FlightTelemetry> = {};
    if (!watchedFlights.length) return out;
    const buckets = [data?.commercial_flights, data?.private_flights, data?.private_jets, data?.military_flights];
    const wanted = new Set(watchedFlights.map((w) => w.icao24));
    for (const bucket of buckets) {
      for (const f of bucket || []) {
        if (f?.icao24 && wanted.has(f.icao24)) {
          out[f.icao24] = { lat: f.lat, lng: f.lng, alt: f.alt, speed_knots: f.speed_knots, heading: f.heading, grounded: f.grounded, squawk: f.squawk };
        }
      }
    }
    return out;
  }, [watchedFlights, data]);

  useEffect(() => {
    if (!navSession) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, heading: pos.coords.heading }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [navSession]);
  
  const [showRemote, setShowRemote] = useState(false);
  const [showArcGIS, setShowArcGIS] = useState(false);
  const [arcgisLayers, setArcgisLayers] = useState<Array<{ id: string; title: string; url: string; geojson: any; color: string; visible: boolean; opacity: number }>>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; bounds?: { west: number; south: number; east: number; north: number } } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'layers'|'markets'|'intel'|'search'|'recon'|'remote'|null>(null);
  const [mapProjection, setMapProjection] = useState<'globe'|'mercator'>('globe');
  const [terrainFocus, setTerrainFocus] = useState(0);
  const [terrainStatus, setTerrainStatus] = useState<TerrainStatus>('idle');
  const [terrainRetry, setTerrainRetry] = useState(0);
  const [mapStyle, setMapStyle] = useState<'dark'|'satellite'>('dark');
  const [sweepData, setSweepData] = useState<any>(null);
  const [scanTargets, setScanTargets] = useState<any[]>([]);
  const [drawnPolygons, setDrawnPolygons] = useState<DrawnShape[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [axissTheme, setAxissTheme] = useState<'core'|'ghost'>('core');

  useEffect(() => {
    document.body.className = axissTheme === 'core' ? '' : `theme-${axissTheme}`;
  }, [axissTheme]);

  useEffect(() => {
    const saved = loadSavedSettings();
    if (saved) applySettings(saved);
  }, []);

  const isMobile = useIsMobile();
  const startTime = useRef(Date.now());
  const geocodeCache = useRef<Map<string, string>>(new Map());
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedPos = useRef<{ lat: number; lng: number } | null>(null);

  const [activeLayers, setActiveLayers] = useState({
    flights: false, private: false, jets: false, military: false, maritime: true,
    satellites: false, sat_comms: false, sat_military: false, sat_navigation: false,
    sat_earth: false, sat_science: false, balloons: false, cctv: true, cctv_previews: true,
    live_news: true, earthquakes: true, fires: false, weather: false, radiation: false,
    infrastructure: false, global_incidents: true, war_alerts: false, day_night: true,
    cables: true, sdk_sea: true, sdk_air: true, sdk_naval: true, terrain_3d: false,
    terrain_elevation: false, malware: false, cyber_attacks: false, gdelt_events: false,
    cf_outages: false, cf_attacks: false,
  });
  
  const selectFlatMap = () => {
    setActiveLayers(prev => ({ ...prev, terrain_elevation: false, terrain_3d: false }));
    setMapProjection('mercator');
  };
  
  const terrainPanelProps = {
    terrainStatus,
    on3DModeSelected: () => setMapProjection('globe'),
    onTerrainRetry: () => setTerrainRetry(value => value + 1),
    onTerrainFocus: () => setTerrainFocus(value => value + 1),
  };
  
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({});
  const [liveFeedUrl, setLiveFeedUrl] = useState<string | null>(null);
  const [liveFeedName, setLiveFeedName] = useState('');
  const [liveFeedEmbedAllowed, setLiveFeedEmbedAllowed] = useState(true);

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const layers = p.get('layers');
    if (layers) {
      const active = layers.split(',');
      setActiveLayers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { (next as any)[k] = active.includes(k); });
        return next;
      });
    }

    fetch('/api/cloudflare-radar?probe=1')
      .then(r => (r.ok ? r.json() : null))
      .then(p => { if (p) setCapabilities(c => ({ ...c, cloudflare: !!p.configured })); })
      .catch(() => {});

    const geoController = new AbortController();
    const cancelAutoLocate = () => { autoLocateCancelled.current = true; };
    window.addEventListener('pointerdown', cancelAutoLocate, { once: true });
    window.addEventListener('keydown', cancelAutoLocate, { once: true });
    const geoTimer = setTimeout(() => {
      if (autoLocateCancelled.current) return;
      fetch('/api/geo', { signal: geoController.signal })
        .then(r => r.json())
        .then(geo => {
          if (!autoLocateCancelled.current && !geoController.signal.aborted && geo.status === 'success' &&
              Number.isFinite(geo.lat) && Number.isFinite(geo.lon) && Math.abs(geo.lat) <= 90 && Math.abs(geo.lon) <= 180) {
            setFlyToLocation({ lat: geo.lat, lng: geo.lon, zoom: 8, ts: Date.now() });
          }
        })
        .catch(() => {});
    }, 3000);

    return () => {
      clearTimeout(geoTimer); geoController.abort();
      window.removeEventListener('pointerdown', cancelAutoLocate);
      window.removeEventListener('keydown', cancelAutoLocate);
    };
  }, []);

  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const active = Object.entries(activeLayers).filter(([,v]) => v).map(([k]) => k).join(',');
      const url = `${window.location.pathname}?layers=${active}`;
      window.history.replaceState(null, '', url);
    }, 1500);
  }, [activeLayers]);

  useEffect(() => {
    fetch('/api/stats').then(res => res.json()).then(d => { if (d.stats) setGlobalStats(d.stats); }).catch(console.error);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === 'f' && !e.ctrlKey) {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
      if (e.key === 'l') setShowLayers(p => !p);
      if (e.key === 'm') setShowMarkets(p => !p);
      if (e.key === 'c') setShowScmPanel(p => !p);
      if (e.key === 'i') setShowIntel(p => !p);
      if (e.key === 's') { setShowDesktopSearch(p => !p); setShowIntel(false); setShowMarkets(false); setShowAlerts(false); setShowSpaceCam(false); }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) setFlyToLocation({ lat: 20, lng: 0, zoom: 2.5, ts: Date.now() });
      if (e.key === 'g') {
        setActiveLayers(prev => ({ ...prev, terrain_elevation: false, terrain_3d: false }));
        setMapProjection(p => p === 'globe' ? 'mercator' : 'globe');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowDesktopSearch(true); setShowIntel(false); setShowMarkets(false); setShowAlerts(false); setShowSpaceCam(false);
      }
    };
    const fsHandler = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('keydown', handler);
    document.addEventListener('fullscreenchange', fsHandler);
    return () => { window.removeEventListener('keydown', handler); document.removeEventListener('fullscreenchange', fsHandler); };
  }, []);

  const handleMouseCoords = useCallback((coords: { lat: number; lng: number }) => {
    mouseCoordsRef.current = coords;
    if (coordsDisplayRef.current) coordsDisplayRef.current.innerText = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      if (lastGeocodedPos.current) {
        const d = Math.abs(coords.lat - lastGeocodedPos.current.lat) + Math.abs(coords.lng - lastGeocodedPos.current.lng);
        if (d < 0.5) return;
      }
      const gk = `${coords.lat.toFixed(1)},${coords.lng.toFixed(1)}`;
      if (geocodeCache.current.has(gk)) { setLocationLabel(geocodeCache.current.get(gk)!); lastGeocodedPos.current = coords; return; }
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&zoom=10&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
        if (res.ok) {
          const d = await res.json();
          const a = d.address || {};
          const label = [a.city||a.town||a.village||a.county, a.state||a.region, a.country].filter(Boolean).join(', ') || 'Unknown';
          if (geocodeCache.current.size > 500) { const it = geocodeCache.current.keys(); for (let i=0;i<100;i++) { const k = it.next().value; if(k) geocodeCache.current.delete(k); }}
          geocodeCache.current.set(gk, label);
          setLocationLabel(label);
          lastGeocodedPos.current = coords;
        }
      } catch (e) { console.warn('[AXISS] Suppressed error:', e instanceof Error ? e.message : e); }
    }, 3000);
  }, []);

  const handleRightClick = useCallback(async (coords: { lat: number; lng: number }) => {
    setDossierLoading(true); setRegionDossier(null);
    try {
      const res = await fetch(`/api/region-dossier?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) setRegionDossier(await res.json());
    } catch (e) { console.warn('[AXISS] Suppressed error:', e instanceof Error ? e.message : e); } finally { setDossierLoading(false); }
  }, []);
  
  const handleEntityClick = useCallback((entity: any) => {
    if (entity?.type === 'cctv') setActiveCamera(entity);
    if (entity?.type === 'live_news' && entity.url) {
      setLiveFeedUrl(entity.url); setLiveFeedName(entity.name); setLiveFeedEmbedAllowed(entity.embed_allowed !== false);
    }
  }, []);

  useEffect(() => {
    try {
      const restored = deserializeShapes(localStorage.getItem(STORAGE_KEY));
      if (restored.length) setDrawnPolygons(restored);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, serializeShapes(drawnPolygons)); } catch {}
  }, [drawnPolygons]);

  useEffect(() => {
    if (watched.size === 0) return;
    const now = Date.now();
    const fresh: WatchEvent[] = [];
    for (const shape of drawnPolygons) {
      if (!watched.has(shape.id)) continue;
      const ring = queryRing(shape);
      if (!ring) continue;
      const report = selectInPolygon(ring, dataRef.current as any);
      const prev = watchBaselines.current[shape.id] ?? null;
      const { baseline, events } = diffSweep(shape.id, report, prev, now);
      watchBaselines.current[shape.id] = baseline;
      fresh.push(...events);
    }
    if (fresh.length) setWatchEvents(log => appendEvents(log, fresh));
  }, [dataVersion, watched, drawnPolygons]);

  const toggleWatch = useCallback((id: string) => {
    setWatched(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); delete watchBaselines.current[id]; } else { next.add(id); }
      return next;
    });
  }, []);

  const handleDrawComplete = useCallback((result: DrawResult) => {
    setDrawnPolygons(prev => [toShape(result, prev, prev.length), ...prev]);
    setDrawMode(null); setDrawProgress(null);
  }, []);

  const handleExportGeoJSON = useCallback(() => {
    downloadFile(`axiss-aoi-${new Date().toISOString().slice(0, 10)}.geojson`, JSON.stringify(shapesToGeoJSON(drawnPolygons), null, 2), 'application/geo+json');
  }, [drawnPolygons]);

  const fetchEndpoint = useCallback(async (
    url: string, transform?: (d: any) => any, options?: RequestInit, { skipWhenHidden = false }: { skipWhenHidden?: boolean } = {},
  ): Promise<boolean> => {
    if (skipWhenHidden && typeof document !== 'undefined' && document.hidden) return false;
    try {
      const res = await fetch(url, { ...options, cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const d = transform ? transform(json) : json;
        dataRef.current = { ...dataRef.current, ...d };
        setDataVersion(v => v + 1); setBackendStatus('connected');
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[AXISS] Suppressed error:', e instanceof Error ? e.message : e);
      setBackendStatus('error'); return false;
    }
  }, []);

  useEffect(() => {
    const eqUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
    const eqTransform = (data: any) => ({ earthquakes: (data.features || []).map((f: any) => ({ id: f.id, lat: f.geometry?.coordinates?.[1] || 0, lng: f.geometry?.coordinates?.[0] || 0, depth: f.geometry?.coordinates?.[2] || 0, magnitude: f.properties?.mag, place: f.properties?.place, time: f.properties?.time, url: f.properties?.url, tsunami: f.properties?.tsunami, type: f.properties?.type, felt: f.properties?.felt, alert: f.properties?.alert })) });
    fetchEndpoint(eqUrl, eqTransform);
    fetchEndpoint('/api/news', newsTransform);
    const marketRetries: ReturnType<typeof setTimeout>[] = [];
    const loadMarkets = async (attempt = 0) => {
      await fetchEndpoint('/api/markets', d => ({ markets: d }));
      if ((dataRef.current.markets?.count || 0) === 0 && attempt < 3) marketRetries.push(setTimeout(() => loadMarkets(attempt + 1), 15000));
    };
    const marketTimer = setTimeout(() => loadMarkets(), 800);
    const spaceTimer = setTimeout(async () => {
      try { const r = await fetch('/api/space-weather'); if (r.ok) setSpaceWeather(await r.json()); } catch (e) {}
    }, 5000);
    const intervals = [
      setInterval(() => fetchEndpoint(eqUrl, eqTransform, undefined, { skipWhenHidden: true }), 900000),
      setInterval(() => fetchEndpoint('/api/news', newsTransform, undefined, { skipWhenHidden: true }), 300000),
      setInterval(() => fetchEndpoint('/api/markets', d => ({ markets: d }), undefined, { skipWhenHidden: true }), 900000),
    ];
    return () => { clearTimeout(marketTimer); marketRetries.forEach(clearTimeout); clearTimeout(spaceTimer); intervals.forEach(clearInterval); };
  }, [fetchEndpoint]);

  const layerFetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!activeLayers.cctv) return;
    return loadCameraCatalog(cameras => {
      dataRef.current = { ...dataRef.current, cameras: mergeCameraCatalog(dataRef.current.cameras ?? [], cameras) };
      setDataVersion(value => value + 1); setBackendStatus('connected');
    }, () => console.warn('[AXISS] Camera catalogue load failed; bounded retry scheduled'));
  }, [activeLayers.cctv]);

  useEffect(() => {
    if (activeLayers.cctv) {
      dataRef.current = { ...dataRef.current, cameras: mergeCameraCatalog(dataRef.current.cameras ?? [], KENYA_CCTV_FEEDS) };
      setDataVersion(v => v + 1);
    }
    if (activeLayers.weather) {
      dataRef.current = { ...dataRef.current, weather_events: [...(dataRef.current.weather_events ?? []), ...KENYA_WEATHER_EVENTS] };
      setDataVersion(v => v + 1);
    }
  }, [activeLayers.cctv, activeLayers.weather]);

  useEffect(() => {
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      if (!layerFetchedRef.current.has('flights')) { fetchEndpoint('/api/flights'); layerFetchedRef.current.add('flights'); }
    }
    const anySatLayer = activeLayers.satellites || activeLayers.sat_comms || activeLayers.sat_military || activeLayers.sat_navigation || activeLayers.sat_earth || activeLayers.sat_science;
    if (anySatLayer && !layerFetchedRef.current.has('satellites')) { fetchEndpoint('/api/satellites', d => ({ ...d, satellites_at: d.timestamp })); layerFetchedRef.current.add('satellites'); }
    if (activeLayers.fires && !layerFetchedRef.current.has('fires')) { fetchEndpoint('/api/fires'); layerFetchedRef.current.add('fires'); }
    if (activeLayers.maritime && !layerFetchedRef.current.has('maritime')) { fetchEndpoint('/api/maritime', d => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, maritime_ships: d.ships })); layerFetchedRef.current.add('maritime'); }
    if (activeLayers.balloons && !layerFetchedRef.current.has('balloons')) { fetchEndpoint('/api/balloons', d => ({ balloons: d.balloons })); layerFetchedRef.current.add('balloons'); }
    if (activeLayers.radiation && !layerFetchedRef.current.has('radiation')) { fetchEndpoint('/api/radiation', d => ({ radiation: d.stations })); layerFetchedRef.current.add('radiation'); }
    if (activeLayers.live_news && !layerFetchedRef.current.has('live_news')) { fetchEndpoint('/api/live-news', d => ({ live_feeds: d.feeds })); layerFetchedRef.current.add('live_news'); }
    if (activeLayers.weather && !layerFetchedRef.current.has('weather')) { fetchEndpoint('/api/weather', d => ({ weather_events: d.events })); layerFetchedRef.current.add('weather'); }
    if (activeLayers.infrastructure && !layerFetchedRef.current.has('infrastructure')) { fetchEndpoint('/api/infrastructure', d => ({ infrastructure: d.infrastructure })); layerFetchedRef.current.add('infrastructure'); }
    if (activeLayers.global_incidents && !layerFetchedRef.current.has('gdelt')) { fetchEndpoint('/api/gdelt', d => ({ gdelt: d.events })); layerFetchedRef.current.add('gdelt'); }
    if (activeLayers.cables && !layerFetchedRef.current.has('cables')) {
      (async () => {
        try {
          const ts = Date.now(); const res = await fetch(`/data/submarine-cables.json?v=${ts}`);
          if (res.ok) { const cablesData = await res.json(); dataRef.current = { ...dataRef.current, submarine_cables: cablesData.features }; setDataVersion(v => v + 1); }
        } catch (e) {}
      })();
      layerFetchedRef.current.add('cables');
    }
    if ((activeLayers as any).cyber_attacks && !layerFetchedRef.current.has('cyber_attacks')) { fetchEndpoint('/api/cyber-attacks', d => ({ cyber_attacks: d.indicators })); layerFetchedRef.current.add('cyber_attacks'); }
    const loadLayerOnce = (key: string, url: string, transform: (d: any) => any) => {
      if (layerFetchedRef.current.has(key)) return;
      layerFetchedRef.current.add(key);
      fetchEndpoint(url, transform).then(ok => { if (!ok) layerFetchedRef.current.delete(key); });
    };
    if ((activeLayers as any).gdelt_events) loadLayerOnce('gdelt_events', '/api/gdelt-events?limit=600', d => ({ gdelt_events: d.events }));
    if ((activeLayers as any).cf_outages || (activeLayers as any).cf_attacks) loadLayerOnce('cloudflare_radar', '/api/cloudflare-radar', d => ({ cf_outages: d.outages ?? [], cf_attack_origins: d.attack_origins ?? [] }));
  }, [activeLayers]);

  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) intervals.push(setInterval(() => fetchEndpoint('/api/flights'), 300000));
    if (activeLayers.balloons) intervals.push(setInterval(() => fetchEndpoint('/api/balloons', d => ({ balloons: d.balloons })), 300000));
    if (activeLayers.radiation) intervals.push(setInterval(() => fetchEndpoint('/api/radiation', d => ({ radiation: d.stations })), 300000));
    if (activeLayers.maritime) intervals.push(setInterval(() => fetchEndpoint('/api/maritime', d => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, maritime_ships: d.ships })), 10000));
    if ((activeLayers as any).cyber_attacks) intervals.push(setInterval(() => { layerFetchedRef.current.delete('cyber_attacks'); fetchEndpoint('/api/cyber-attacks', d => ({ cyber_attacks: d.indicators })); layerFetchedRef.current.add('cyber_attacks'); }, 300000));
    return () => intervals.forEach(clearInterval);
  }, [activeLayers, fetchEndpoint]);

  useEffect(() => {
    if (!activeLayers.malware) return;
    const source = new EventSource('/api/malware/stream');
    const byIp = new Map<string, LiveDetection>();
    let filled = false;
    const commit = () => { dataRef.current = { ...dataRef.current, malware_threats: [...byIp.values()] }; setDataVersion(v => v + 1); };
    source.onmessage = ev => {
      try {
        const event = JSON.parse(ev.data);
        if (event.type === 'snapshot') { byIp.clear(); for (const d of event.detections) byIp.set(d.ip, d); commit(); }
        else if (event.type === 'detections') {
          const beacon = filled && event.fresh;
          for (const d of event.detections) byIp.set(d.ip, beacon ? { ...d, detected_at: Date.now() } : { ...d, detected_at: byIp.get(d.ip)?.detected_at });
          commit();
        } else if (event.type === 'status') {
          filled = true;
          if (event.retired?.length) { for (const ip of event.retired) byIp.delete(ip); commit(); }
        }
        setBackendStatus('connected');
      } catch {}
    };
    source.onopen = () => setBackendStatus('connected');
    source.onerror = () => { if (source.readyState === EventSource.CLOSED) setBackendStatus('error'); };
    return () => source.close();
  }, [activeLayers.malware]);

  useEffect(() => {
    const anyActive = activeLayers.sdk_sea || activeLayers.sdk_air || activeLayers.sdk_naval;
    if (!anyActive) { dataRef.current = { ...dataRef.current, sdk_entities: [] }; return; }
    const sdkEntities: any[] = [];
    const allFlights = [...(data.commercial_flights || []), ...(data.private_flights || []), ...(data.private_jets || []), ...(data.military_flights || [])];
    const flightStep = Math.max(1, Math.floor(allFlights.length / 60));
    for (let i = 0; i < allFlights.length; i += flightStep) {
      const f = allFlights[i];
      if (!f.lat || !f.lng) continue;
      sdkEntities.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] }, properties: { domain: 'AIR', name: f.callsign?.trim() || 'TRACK', source: 'ADS-B / OpenSky' } });
    }
    const ships = data.maritime_ships || [];
    const shipStep = Math.max(1, Math.floor(ships.length / 60));
    for (let i = 0; i < ships.length; i += shipStep) {
      const s = ships[i];
      if (!s.lat || !s.lng) continue;
      sdkEntities.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { domain: 'SEA', name: s.name || `MMSI-${s.mmsi}`, source: 'AIS Stream' } });
    }
    if (data.earthquakes?.length) {
      for (const eq of data.earthquakes) {
        if (!eq.lat || !eq.lng) continue;
        sdkEntities.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [eq.lng, eq.lat] }, properties: { domain: 'LAND', name: `M${eq.magnitude} ${eq.place || ''}`, source: 'USGS' } });
      }
    }
    if (data.gdelt?.length) {
      for (const g of data.gdelt) {
        if (!g.lat || !g.lng) continue;
        sdkEntities.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [g.lng, g.lat] }, properties: { domain: 'INTEL', name: g.name || 'GDELT Event', source: 'GDELT Project' } });
      }
    }
    if (data.news?.length) {
      for (const n of data.news) {
        if (!n.coords || n.coords.length < 2) continue;
        sdkEntities.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [n.coords[1], n.coords[0]] }, properties: { domain: 'INTEL', name: n.title || 'SIGINT', source: n.source || 'RSS Feed' } });
      }
    }
    dataRef.current = { ...dataRef.current, sdk_entities: sdkEntities };
  }, [dataVersion, activeLayers.sdk_sea, activeLayers.sdk_air, activeLayers.sdk_naval]);

  const totalFlights = useMemo(() => (
    (data.commercial_flights?.length||0)+(data.private_flights?.length||0)+(data.private_jets?.length||0)+(data.military_flights?.length||0)
  ), [data.commercial_flights, data.private_flights, data.private_jets, data.military_flights]);

  return (
    <main className="fixed inset-0 w-full h-full bg-[var(--bg-void)] overflow-hidden">

      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, #0B0E11 0%, var(--bg-void) 70%)' }}
          >
            <div className="absolute inset-0 pointer-events-none z-[1]" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(45, 118, 214, 0.015) 2px, rgba(45, 118, 214, 0.015) 4px)',
              animation: 'splashScanDrift 8s linear infinite',
            }} />

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute top-6 left-6 z-[2] font-mono text-[11px] tracking-[0.3em] text-[var(--gold-primary)]"
            >V4.2</motion.div>

            <div className="relative w-40 h-40 mb-8 flex items-center justify-center z-[2]">
              <motion.div
                initial={{ opacity: 0, scale: 0.6, rotate: 0 }} animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{ opacity: { duration: 0.6 }, scale: { duration: 0.8, ease: 'easeOut' }, rotate: { duration: 20, repeat: Infinity, ease: 'linear' } }}
                className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(45, 118, 214, 0.2)' }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: 'var(--gold-primary)', boxShadow: '0 0 12px var(--gold-primary), 0 0 24px rgba(45, 118, 214, 0.3)' }} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 rounded-full" style={{ background: 'rgba(45, 118, 214, 0.5)', boxShadow: '0 0 6px rgba(45, 118, 214, 0.3)' }} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.4, rotate: 0 }} animate={{ opacity: 1, scale: 1, rotate: -360 }}
                transition={{ opacity: { duration: 0.6 }, scale: { duration: 0.8, delay: 0.15, ease: 'easeOut' }, rotate: { duration: 12, repeat: Infinity, ease: 'linear' } }}
                className="absolute rounded-full" style={{ inset: '18px', border: '1px solid rgba(20, 184, 166, 0.15)' }}
              >
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cyan-primary)', boxShadow: '0 0 10px var(--cyan-primary), 0 0 20px rgba(20, 184, 166, 0.2)' }} />
                <div className="absolute bottom-0 left-1/4 translate-y-1/2 w-1 h-1 rounded-full" style={{ background: 'rgba(20, 184, 166, 0.4)' }} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.2, rotate: 0 }} animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{ opacity: { duration: 0.6 }, scale: { duration: 0.8, delay: 0.3, ease: 'easeOut' }, rotate: { duration: 7, repeat: Infinity, ease: 'linear' } }}
                className="absolute rounded-full" style={{ inset: '40px', border: '1px solid rgba(45, 118, 214, 0.25)' }}
              >
                <div className="absolute top-0 left-1/4 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold-primary)', boxShadow: '0 0 8px var(--gold-primary)' }} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative w-12 h-12 rounded-full flex items-center justify-center"
                style={{ border: '2px solid var(--gold-primary)', boxShadow: '0 0 20px rgba(45, 118, 214, 0.15), inset 0 0 20px rgba(45, 118, 214, 0.05)' }}
              >
                <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-5 h-5 rounded-full" style={{ background: 'radial-gradient(circle, rgba(45, 118, 214, 0.4) 0%, rgba(45, 118, 214, 0.05) 70%)' }} />
                <div className="absolute w-[1px] h-full" style={{ background: 'linear-gradient(to bottom, transparent, rgba(45, 118, 214, 0.3), transparent)' }} />
                <div className="absolute w-full h-[1px]" style={{ background: 'linear-gradient(to right, transparent, rgba(45, 118, 214, 0.3), transparent)' }} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: [0, 0.15, 0], rotate: [0, 360] }}
                transition={{ opacity: { duration: 3, repeat: Infinity }, rotate: { duration: 3, repeat: Infinity, ease: 'linear' }, delay: 0.6 }}
                className="absolute inset-[10px] rounded-full" style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(45, 118, 214, 0.15) 40deg, transparent 80deg)' }}
              />
            </div>

            <div className="flex items-center gap-[2px] mb-3 z-[2]">
              {'AXISS'.split('').map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                  className="text-4xl md:text-5xl font-bold tracking-[0.5em] font-mono"
                  style={{ color: 'var(--text-heading)', textShadow: '0 0 30px rgba(45, 118, 214, 0.2)' }}
                >{letter}</motion.span>
              ))}
            </div>

            <div className="overflow-hidden mb-8 z-[2]">
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ delay: 1.2, duration: 0.8, ease: 'easeInOut' }} className="overflow-hidden whitespace-nowrap">
                <p className="text-[11px] md:text-[10px] font-mono tracking-[0.5em] text-[var(--gold-primary)]" style={{ opacity: 0.8 }}>GLOBAL INTELLIGENCE PLATFORM</p>
              </motion.div>
            </div>

            <div className="w-64 md:w-80 z-[2]">
              <div className="relative w-full h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(45, 118, 214, 0.1)' }}>
                <motion.div
                  initial={{ width: '0%' }} animate={{ width: ['0%', '25%', '50%', '78%', '100%'] }}
                  transition={{ duration: 2.2, delay: 0.5, times: [0, 0.25, 0.5, 0.75, 1], ease: 'easeInOut' }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--gold-primary), var(--cyan-primary), var(--gold-primary))', boxShadow: '0 0 12px rgba(45, 118, 214, 0.4)' }}
                />
              </div>
              <div className="mt-3 h-4 flex items-center justify-center">
                {[
                  { text: 'ESTABLISHING SECURE CONNECTION...', delay: 0.5 },
                  { text: 'INITIALIZING FEEDS...', delay: 1.1 },
                  { text: 'CALIBRATING SENSORS...', delay: 1.7 },
                  { text: 'SYSTEM READY', delay: 2.2 },
                ].map((stage, i) => (
                  <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ delay: stage.delay, duration: 0.6, times: [0, 0.1, 0.7, 1] }}
                    className="absolute text-[10px] font-mono tracking-[0.25em]" style={{ color: i === 3 ? 'var(--cyan-primary)' : 'var(--text-muted)' }}>
                    {stage.text}
                  </motion.span>
                ))}
              </div>
            </div>

            <div className="absolute inset-0 pointer-events-none z-[0]" style={{ opacity: 0.03 }}>
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(45, 118, 214, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(45, 118, 214, 0.5) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }} />
            </div>

            {[
              { t: '10px', l: '10px', bw: '2px 0 0 2px' }, { t: '10px', r: '10px', bw: '2px 2px 0 0' },
              { b: '10px', l: '10px', bw: '0 0 2px 2px' }, { b: '10px', r: '10px', bw: '0 2px 2px 0' },
            ].map((pos, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                className="absolute w-8 h-8 z-[2]" style={{ top: pos.t, bottom: pos.b, left: pos.l, right: pos.r, borderWidth: pos.bw, borderStyle: 'solid', borderColor: 'var(--gold-primary)' }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <ErrorBoundary name="Map">
        <AxissMap 
          key={axissTheme}
          data={data} activeLayers={activeLayers} projection={mapProjection === 'mercator' ? 'mercator' : 'globe'}
          terrainEnabled={activeLayers.terrain_elevation && mapProjection === 'globe'}
          terrainFocus={terrainFocus} terrainRetry={terrainRetry} onTerrainStatusChange={setTerrainStatus}
          mapStyle={mapStyle === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'dark'} 
          onEntityClick={handleEntityClick} onMouseCoords={handleMouseCoords} onRightClick={handleRightClick} 
          onViewStateChange={setMapView} flyToLocation={flyToLocation} sweepData={sweepData} scanTargets={scanTargets}
          demoMode={demoMode} theme={axissTheme}
          arcgisLayers={arcgisLayers.filter(l => l.visible).map(l => ({ id: l.id, title: l.title, geojson: l.geojson, color: l.color, opacity: l.opacity }))}
          onMapCenter={setMapCenter} route={activeRoute}
          userLocation={navSession && navProgress ? { lat: navProgress.snapped[1], lng: navProgress.snapped[0], accuracy: liveLocation?.accuracy, heading: liveLocation?.heading } : liveLocation}
          followUser={followUser} onFollowInterrupt={() => setFollowUser(false)} navigating={Boolean(navSession)}
          drawMode={drawMode} onDrawProgress={setDrawProgress} drawCommand={drawCommand}
          onDrawCancel={() => { setDrawMode(null); setDrawProgress(null); }} onDrawComplete={handleDrawComplete}
          drawnPolygons={drawnPolygons} aircraftAirports={aircraftAirports}
        />
      </ErrorBoundary>

      <div className="absolute top-3 z-[400] w-[min(92vw,372px)] pointer-events-auto" style={isMobile ? { left: '50%', transform: 'translateX(-50%)' } : { right: '56px' }}>
        {navSession ? (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <NavigationView key={navSession.key} route={navSession.route} destinationLabel={navSession.label} fix={liveLocation}
              onProgress={setNavProgress} following={followUser} onRecenter={() => setFollowUser(true)}
              onExit={() => { setNavSession(null); setNavProgress(null); setFollowUser(false); }}
              onReroute={async (fromPt) => {
                const dest = navSession.route.geometry.coordinates.at(-1)!;
                try {
                  const res = await fetch(`/api/directions?from=${fromPt.lat},${fromPt.lng}&to=${dest[1]},${dest[0]}&mode=auto`);
                  const data = await res.json();
                  if (res.ok && !data.error) {
                    setNavSession((n) => (n ? { ...n, route: data, key: Date.now() } : n));
                    setActiveRoute({ ...data, from: fromPt, to: { lat: dest[1], lng: dest[0] } });
                  }
                } catch {}
              }}
            />
          </motion.div>
        ) : null}

        {showDirections && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: navSession ? 0 : 1, y: 0 }} className={navSession ? 'pointer-events-none h-0 overflow-hidden' : ''} aria-hidden={Boolean(navSession)}>
            <DirectionsBar center={mapCenter ? { lat: mapCenter.lat, lng: mapCenter.lng } : null} onRoute={(r) => setActiveRoute(r)} onLiveLocation={setLiveLocation}
              onFollowChange={setFollowUser} onActiveSegment={(seg) => setActiveRoute((r) => (r ? { ...r, activeSegment: seg } : r))}
              onStartNavigation={(r, label) => { setNavSession({ route: r, label, key: Date.now() }); setFollowUser(true); }}
              onLocate={(lat, lng, zoom) => setFlyToLocation({ lat, lng, zoom, ts: Date.now() })} onClose={() => { setShowDirections(false); setActiveRoute(null); }} />
          </motion.div>
        )}
      </div>

      {watchedFlights.length > 0 && (
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          className="absolute top-3 z-[380] w-[min(92vw,290px)] pointer-events-auto max-h-[calc(100vh-180px)] overflow-y-auto styled-scrollbar"
          style={{ left: isMobile ? '12px' : '120px' }}>
          <FlightWatchPanel watched={watchedFlights} telemetry={watchTelemetry} onRemove={removeWatched} onLocate={(lat, lng) => setFlyToLocation({ lat, lng, zoom: 8, ts: Date.now() })} onDetail={handleAircraftDetail} />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.5 }} className="absolute bottom-[75px] md:bottom-[100px] z-[200] flex flex-col gap-1.5 pointer-events-none" style={{ left: isMobile ? '12px' : '120px' }}>
        <div className="flex items-center gap-[3px] p-[3px] pointer-events-auto rounded-xl border border-[var(--border-primary)] bg-[var(--bg-panel)] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.55)]">
          <ViewSegment layoutId="view-projection" active={mapProjection === 'globe'} onClick={() => setMapProjection('globe')} title="3D Globe" icon={Globe} label="3D" />
          <ViewSegment layoutId="view-projection" active={mapProjection === 'mercator'} onClick={selectFlatMap} title="2D Map" icon={MapPinned} label="2D" />
          <div className="w-px h-5 mx-1 bg-[var(--border-secondary)]" />
          <ViewSegment layoutId="view-style" active={mapStyle === 'dark'} onClick={() => setMapStyle('dark')} title="Night Mode" icon={Moon} label="MAP" />
          <ViewSegment layoutId="view-style" active={mapStyle === 'satellite'} onClick={() => setMapStyle('satellite')} title="Satellite View" icon={Satellite} label="SAT" />
        </div>
        {!isMobile && ( <div className="pl-0.5"><ScaleBar zoom={mapView.zoom} latitude={mapView.latitude} /></div> )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 2.5 }} className={`absolute top-4 z-[200] pointer-events-none flex flex-col`} style={{ left: isMobile ? '24px' : '64px', right: '24px' }}>
        <div className="flex items-center gap-3 w-fit">
          {/* AXISS Tactical Logo */}
          <svg viewBox="0 0 100 100" className="w-8 h-8 md:w-10 md:h-10 shrink-0 transition-colors duration-500 text-[var(--gold-primary)] drop-shadow-[0_0_8px_rgba(45,118,214,0.5)]" fill="currentColor">
            <path d="M50 10 L90 80 L70 80 L50 40 L30 80 L10 80 Z" />
            <circle cx="50" cy="54" r="10" fill="none" stroke="var(--cyan-primary)" strokeWidth="4" />
            <path d="M50 0 L50 20 M50 90 L50 100 M0 50 L20 50 M80 50 L100 50" stroke="var(--cyan-primary)" strokeWidth="6" strokeLinecap="round" />
          </svg>
          <div className="flex flex-col items-start gap-0.5">
            <h1 className="text-lg md:text-xl font-bold tracking-[0.4em] text-[var(--gold-primary)] font-mono">AXISS</h1>
            <span className="text-[9px] md:text-[10px] font-mono tracking-[0.2em] opacity-80 uppercase text-[var(--gold-primary)]">ADVANCED X-INTELLIGENCE SYSTEM</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5 pl-[44px] min-w-0 pr-4">
          <span className="text-[9px] md:text-[9px] text-[var(--text-muted)] font-mono tracking-[0.2em] md:tracking-[0.3em] uppercase opacity-40 truncate">
            REAL-TIME GLOBAL MONITORING <span className="hidden md:inline">· FLIGHTS · MARITIME · SATELLITES · CCTV · WEATHER · CYBER THREATS</span>
          </span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }} className="status-bar-desktop absolute top-4 right-6 z-[200] pointer-events-none flex items-center gap-3 text-[10px] font-mono tracking-widest text-[var(--text-muted)]">
        <span className="hidden lg:inline-flex items-center gap-1.5"><ZuluClock /></span>
        <span className="flex items-center gap-1" title="Backend connection status">STATUS: <span className={backendStatus === 'connected' ? 'text-[var(--alert-green)]' : 'text-[var(--alert-red)]'}>{backendStatus === 'connected' ? 'LIVE' : backendStatus.toUpperCase()}</span></span>
        <span className="hidden lg:inline-flex items-center gap-1" title="Number of active data layers">
          <span className="text-[var(--cyan-primary)] font-bold">{Object.values(activeLayers).filter(Boolean).length}</span>
          <span className="opacity-60">LAYERS</span>
        </span>
        <span className="hidden lg:inline-flex items-center gap-1" title="Tracked entities on map">
          <ActiveEntityCount data={data} /><span className="opacity-60">ENTITIES</span>
        </span>
        {spaceWeather && <span className="hidden lg:inline" title={spaceWeather.kp_index == null ? 'Geomagnetic Storm Index — no reading from NOAA' : `Geomagnetic Storm Index — Kp${spaceWeather.kp_index}`}>SOLAR: <span style={{ color: spaceWeather.storm_color, fontWeight: 700 }}>{spaceWeather.kp_index == null ? 'N/A' : `Kp${spaceWeather.kp_index}`}</span></span>}
        <span className="text-[11px] font-bold tracking-[0.2em] text-[var(--text-muted)] opacity-50">V.4.1</span>
        <TokenPanel />
      </motion.div>

      {isMobile && !showDirections && !navSession && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="absolute top-3 right-3 z-[200] pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <TokenPanel />
            <a href='https://ko-fi.com/M8D41ZYW4Z' target='_blank' rel='noopener noreferrer' className="glass-panel px-2 py-1 flex items-center gap-1.5 text-[9px] font-mono tracking-widest hover:opacity-80 transition-opacity border-[var(--gold-primary)]/40 bg-[var(--gold-primary)]/10">
              <div className="w-1 h-1 rounded-full bg-[var(--gold-primary)] animate-osiris-pulse" />
              <span className="text-[var(--gold-primary)] font-bold"></span>
            </a>
          </div>
          <a href='https://shop.axiss.live/' target='_blank' rel='noopener noreferrer' className="glass-panel px-2 py-1 flex items-center gap-1.5 text-[9px] font-mono tracking-widest hover:opacity-80 transition-opacity border-[var(--cyan-primary)]/40 bg-[var(--cyan-primary)]/10">
            <ShoppingBag className="w-2.5 h-2.5 text-[var(--cyan-primary)]" />
            <span className="text-[var(--cyan-primary)] font-bold"></span>
          </a>
        </motion.div>
      )}

      {showLayers && !isMobile && <LayerPanel {...terrainPanelProps} data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} theme={axissTheme} setTheme={setAxissTheme} capabilities={capabilities} />}

      {!isMobile && <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[250] pointer-events-auto bg-black/40 backdrop-blur-sm p-1 rounded-full border border-white/5">
        <div className="relative group">
          <button onClick={() => { setShowIntel(!showIntel); setShowMarkets(false); setShowAlerts(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showIntel ? 'bg-[var(--cyan-primary)]/20' : 'hover:bg-white/10'}`} title="OSINT Recon — IP lookup, network sweep, geolocation" aria-label="OSINT Recon" aria-expanded={showIntel}>
            <Radar className={`w-4 h-4 ${showIntel ? 'text-[var(--cyan-primary)]' : 'text-white/60'}`} />
            {showIntel && (<span aria-hidden="true" className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[var(--cyan-primary)]" />)}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">RECON</span>
          <AnimatePresence>
            {showIntel && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-80">
                <OsintPanel onSweepVisualize={setSweepData} onScanGeolocate={(target, data) => {
                  setScanTargets(prev => { const existing = prev.filter(t => t.id !== target); return [{ id: target, timestamp: Date.now(), ...data }, ...existing].slice(0, 10); });
                  setFlyToLocation({ lat: data.lat, lng: data.lng, ts: Date.now() });
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative group">
          <button onClick={() => { setShowIntel(false); setShowAlerts(false); setShowMarkets(false); setShowSpaceCam(v => !v); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showSpaceCam ? 'bg-[#00E5FF]/20' : 'hover:bg-white/10'}`} title="Live from Space — 24/7 video downlink from the ISS" aria-label="Live from Space" aria-expanded={showSpaceCam}>
            <Radio className={`w-4 h-4 ${showSpaceCam ? 'text-[#00E5FF]' : 'text-white/60'}`} />
            {showSpaceCam && (<span aria-hidden="true" className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[#00E5FF]" />)}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">SPACE</span>
          <AnimatePresence>
            {showSpaceCam && (<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-80"><SpaceCam /></motion.div>)}
          </AnimatePresence>
        </div>

        <div className="relative group">
          <button onClick={() => { setShowMarkets(!showMarkets); setShowIntel(false); setShowAlerts(false); setShowSpaceCam(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showMarkets ? 'bg-[var(--gold-primary)]/20' : 'hover:bg-white/10'}`} title="Markets — crypto prices, space weather, global indices" aria-label="Markets" aria-expanded={showMarkets}>
            <BarChart3 className={`w-4 h-4 ${showMarkets ? 'text-[var(--gold-primary)]' : 'text-white/60'}`} />
            {showMarkets && (<span aria-hidden="true" className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[var(--gold-primary)]" />)}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">MARKETS</span>
          <AnimatePresence>
            {showMarkets && (<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-80"><MarketsPanel data={data} spaceWeather={spaceWeather} /></motion.div>)}
          </AnimatePresence>
        </div>

        <div className="relative group">
          <button onClick={() => { setShowAlerts(!showAlerts); setShowIntel(false); setShowMarkets(false); setShowDrawing(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showAlerts ? 'bg-[#FF3D3D]/20' : 'hover:bg-white/10'}`} title="Live Alerts — earthquakes, conflicts, breaking news" aria-label="Live Alerts" aria-expanded={showAlerts}>
            <AlertTriangle className={`w-4 h-4 ${showAlerts ? 'text-[#FF3D3D]' : 'text-white/60'}`} />
            {showAlerts && (<span aria-hidden="true" className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[#FF3D3D]" />)}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">ALERTS</span>
          <AnimatePresence>
            {showAlerts && (<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-80"><LiveAlerts data={data} onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} onWatchFeed={(url, name) => { setLiveFeedUrl(url); setLiveFeedName(name); }} onRefresh={() => fetchEndpoint('/api/news', newsTransform)} /></motion.div>)}
          </AnimatePresence>
        </div>

        <div className="relative group">
          <button onClick={() => { setShowDrawing(!showDrawing); setShowIntel(false); setShowMarkets(false); setShowAlerts(false); setShowSpaceCam(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showDrawing ? 'bg-[#00E5FF]/20' : 'hover:bg-white/10'}`} title="Draw — measure areas of interest on the map" aria-label="Draw" aria-expanded={showDrawing}>
            <PenLine className={`w-4 h-4 ${showDrawing ? 'text-[#00E5FF]' : 'text-white/60'}`} />
            {showDrawing && (<span aria-hidden="true" className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[#00E5FF]" />)}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">DRAW</span>
        </div>

        <div className="relative group">
          <button onClick={() => { setShowDirections(!showDirections); if (showDirections) { setActiveRoute(null); } setShowDesktopSearch(false); setShowIntel(false); setShowMarkets(false); setShowAlerts(false); setShowSpaceCam(false); setShowDrawing(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showDirections ? 'bg-[var(--gold-primary)]/20' : 'hover:bg-white/10'}`} title="Directions — turn-by-turn routing" aria-label="Directions" aria-expanded={showDirections}>
            <Route className={`w-4 h-4 ${showDirections ? 'text-[var(--gold-primary)]' : 'text-white/60'}`} />
            {showDirections && (<span aria-hidden="true" className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[var(--gold-primary)]" />)}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">ROUTE</span>
        </div>

        <div className="relative group">
          <button onClick={() => { setShowDesktopSearch(!showDesktopSearch); setShowIntel(false); setShowMarkets(false); setShowAlerts(false); setShowSpaceCam(false); setShowDrawing(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showDesktopSearch ? 'bg-[var(--gold-primary)]/20' : 'hover:bg-white/10'}`} title="Search — find locations, cities, coordinates" aria-label="Search" aria-expanded={showDesktopSearch}>
            <Search className={`w-4 h-4 ${showDesktopSearch ? 'text-[var(--gold-primary)]' : 'text-white/60'}`} />
            {showDesktopSearch && (<span aria-hidden="true" className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[var(--gold-primary)]" />)}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">SEARCH</span>
          <AnimatePresence>
            {showDesktopSearch && (<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-80"><SearchBar alwaysExpanded onLocate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, zoom, ts: Date.now() }); setShowDesktopSearch(false); }} /></motion.div>)}
          </AnimatePresence>
        </div>

        <div className="w-4 h-px bg-white/10 mx-auto" />

        <div className="relative group">
          <button onClick={() => { setShowArcGIS(!showArcGIS); setShowRemote(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showArcGIS ? 'bg-[var(--gold-primary)]/20' : 'hover:bg-white/10'}`} title="ArcGIS — search & import geospatial intel layers" aria-label="ArcGIS" aria-expanded={showArcGIS}>
            <Database className={`w-4 h-4 ${showArcGIS ? 'text-[var(--gold-primary)]' : 'text-white/60'}`} />
            {showArcGIS && (<span aria-hidden="true" className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[var(--gold-primary)]" />)}
            {arcgisLayers.length > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[var(--gold-primary)] text-black text-[9px] font-mono font-bold leading-none px-0.5">{arcgisLayers.length}</span>}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">ARCGIS</span>
          <AnimatePresence>
            {showArcGIS && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-[340px]">
                <div className="glass-panel p-3 max-h-[70vh] overflow-y-auto styled-scrollbar">
                  <ArcGISPanel onImportLayer={(layer) => setArcgisLayers(prev => [...prev.filter(l => l.id !== layer.id), { ...layer, color: layer.color || '#2D76D6', visible: true, opacity: layer.opacity ?? 0.8 }])} onRemoveLayer={(id) => setArcgisLayers(prev => prev.filter(l => l.id !== id))} onUpdateLayer={(id, updates) => setArcgisLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))} importedLayers={arcgisLayers} mapBounds={mapCenter?.bounds || null} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-4 h-px bg-white/10 mx-auto" />

        <div className="relative group">
          <button onClick={() => { setShowRemote(!showRemote); setShowArcGIS(false); setShowIntel(false); setShowMarkets(false); setShowAlerts(false); setShowSpaceCam(false); setShowDrawing(false); setShowDesktopSearch(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showRemote ? 'bg-[var(--cyan-primary)]/20' : 'hover:bg-white/10'}`} title="World Remote — control nearby Bluetooth devices (TVs, speakers, AC)" aria-label="World Remote" aria-expanded={showRemote}>
            <Bluetooth className={`w-4 h-4 ${showRemote ? 'text-[var(--cyan-primary)]' : 'text-white/60'}`} />
            {showRemote && (<span aria-hidden="true" className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[var(--cyan-primary)]" />)}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">REMOTE</span>
          <AnimatePresence>
            {showRemote && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-80">
                <WorldRemote onClose={() => setShowRemote(false)} onPlaceOnMap={(devs) => {
                  setScanTargets(prev => { const ids = new Set(prev.map((t: any) => t.id)); const next = [...prev]; devs.forEach(d => { if (!ids.has(d.id)) next.unshift({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, type: d.type, color: d.color, timestamp: Date.now(), source: 'BLE' }); }); return next.slice(0, 20); });
                  if (devs.length > 0) setFlyToLocation({ lat: devs[0].lat, lng: devs[0].lng, ts: Date.now() });
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>}

      <AnimatePresence>
        {liveFeedUrl && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setLiveFeedUrl(null)}>
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="w-[90vw] max-w-[900px] flex flex-col relative rounded-xl overflow-hidden border border-[var(--border-primary)] shadow-2xl bg-black" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#111] border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF4081] animate-osiris-pulse" />
                  <span className="text-[11px] font-mono font-bold text-white tracking-wider">{liveFeedName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[10px] font-bold">LIVE STREAM</span>
                  {!liveFeedEmbedAllowed && (<span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px]">EXTERNAL ONLY</span>)}
                </div>
                <div className="flex items-center gap-3">
                  <a href={getYouTubeWatchUrl(liveFeedUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--border-primary)] hover:bg-[var(--gold-primary)] hover:text-black text-white transition-colors text-[10px] font-mono">
                    <span>Open in YouTube</span><ExternalLink className="w-3 h-3" />
                  </a>
                  <button onClick={() => setLiveFeedUrl(null)} className="text-white/70 hover:text-white transition-colors p-1"><X className="w-5 h-5" /></button>
                </div>
              </div>
              {liveFeedEmbedAllowed ? (
                <div className="w-full aspect-video relative bg-black"><iframe src={liveFeedUrl} className="w-full h-full absolute inset-0" allow="autoplay; encrypted-media" allowFullScreen /></div>
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-black/95">
                  <div className="text-center px-8">
                    <div className="w-14 h-14 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center mx-auto mb-4"><ExternalLink className="w-6 h-6 text-[#39FF14]" /></div>
                    <p className="text-[12px] font-mono font-bold text-white tracking-widest mb-2">EMBED RESTRICTED</p>
                    <p className="text-[10px] font-mono text-white/50 mb-6 max-w-xs">{liveFeedName} does not allow third-party embedding. Click below to open the live stream directly.</p>
                    <a href={getYouTubeWatchUrl(liveFeedUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-2.5 rounded border border-[#39FF14]/40 text-[#39FF14] font-mono text-[11px] hover:bg-[#39FF14]/10 transition-colors tracking-wider">
                      <ExternalLink className="w-4 h-4" />OPEN LIVE STREAM
                    </a>
                  </div>
                </div>
              )}
              {liveFeedEmbedAllowed && (
                <div className="bg-[#111]/90 px-4 py-2.5 border-t border-[var(--border-primary)] flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[var(--gold-primary)] shrink-0" />
                  <span className="text-[10px] font-mono text-white/70 leading-relaxed">If you see &ldquo;Video unavailable&rdquo;, use <strong className="text-[var(--gold-primary)]">Open in YouTube</strong> above.</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isMobile && (
        <>
          <div className="mobile-nav">
            <div className="glass-panel mobile-nav-inner">
              {[
                { id: 'layers' as const, icon: Layers, label: 'LAYERS' }, { id: 'markets' as const, icon: BarChart3, label: 'MARKETS' },
                { id: 'intel' as const, icon: Newspaper, label: 'INTEL' }, { id: 'recon' as const, icon: Radar, label: 'RECON' },
                { id: 'search' as const, icon: Search, label: 'SEARCH' }, { id: 'route' as const, icon: Route, label: 'ROUTE' },
                { id: 'remote' as const, icon: Bluetooth, label: 'REMOTE' },
              ].map(tab => {
                const isRoute = tab.id === 'route';
                const active = isRoute ? showDirections || Boolean(navSession) : mobilePanel === tab.id;
                return (
                  <button key={tab.id} onClick={() => {
                    if (isRoute) { if (navSession) return; setMobilePanel(null); setShowDirections((open) => { if (open) setActiveRoute(null); return !open; }); return; }
                    setMobilePanel(mobilePanel === tab.id ? null : tab.id);
                  }} aria-pressed={active} disabled={isRoute && Boolean(navSession)} className={`mobile-nav-btn ${active ? 'active' : ''}`}>
                    <tab.icon className={`w-4 h-4 ${tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : ''}`} />
                    <span className={tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : ''}>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {mobilePanel && (
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed bottom-[52px] left-0 right-0 z-[400] glass-panel rounded-b-none overflow-y-auto styled-scrollbar" style={{ maxHeight: 'min(55vh, calc(100dvh - 100px))', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}>
                <div className="mobile-drawer-handle" />
                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="hud-text text-[10px] text-[var(--text-primary)]">{mobilePanel === 'layers' ? 'LAYERS & STATS' : mobilePanel === 'markets' ? 'MARKETS & INTEL' : mobilePanel === 'intel' ? 'INTEL FEED' : mobilePanel === 'recon' ? 'AXISS RECON' : mobilePanel === 'remote' ? 'WORLD REMOTE' : 'SEARCH'}</span>
                    <button onClick={() => setMobilePanel(null)} className="text-[var(--text-muted)] p-1"><X className="w-4 h-4" /></button>
                  </div>
                  {mobilePanel === 'layers' && (
                    <>
                      <div className="glass-panel-sm p-2 mb-2">
                        <div className="grid grid-cols-5 gap-1 text-center">
                          <div><div className="hud-label" style={{fontSize:'9px'}}>AIR</div><div className="hud-value text-[10px]">{totalFlights.toLocaleString()}</div></div>
                          <div><div className="hud-label" style={{fontSize:'9px'}}>SAT</div><div className="hud-value text-[10px]">{(data.satellites?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'9px'}}>CAM</div><div className="hud-value text-[10px]">{(data.cameras?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'9px'}}>WX</div><div className="hud-value text-[10px]" style={{color:'var(--accent-weather)'}}>{(data.weather_events?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'9px'}}>NUC</div><div className="hud-value text-[10px]" style={{color:'var(--accent-nuclear)'}}>{(data.infrastructure?.length||0)}</div></div>
                        </div>
                      </div>
                      <LayerPanel {...terrainPanelProps} data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} isMobile={true} theme={axissTheme} setTheme={setAxissTheme} capabilities={capabilities} />
                      <div className="mt-8"><ViewPresets onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, zoom, ts: Date.now() }); setMobilePanel(null); }} /></div>
                    </>
                  )}
                  {mobilePanel === 'markets' && <MarketsPanel data={data} spaceWeather={spaceWeather} />}
                  {mobilePanel === 'intel' && <IntelFeed data={data} onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />}
                  {mobilePanel === 'search' && (<div className="space-y-2"><SearchBar onLocate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, zoom, ts: Date.now() }); setMobilePanel(null); }} /><SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} /></div>)}
                  {mobilePanel === 'recon' && (<div className="space-y-2"><OsintPanel isOpen={true} onClose={() => setMobilePanel(null)} isMobile={true} onSweepVisualize={setSweepData} /></div>)}
                  {mobilePanel === 'remote' && (<WorldRemote onClose={() => setMobilePanel(null)} onPlaceOnMap={(devs) => { setScanTargets(prev => { const ids = new Set(prev.map((t: any) => t.id)); const next = [...prev]; devs.forEach(d => { if (!ids.has(d.id)) next.unshift({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, type: d.type, color: d.color, timestamp: Date.now(), source: 'BLE' }); }); return next.slice(0, 20); }); if (devs.length > 0) setFlyToLocation({ lat: devs[0].lat, lng: devs[0].lng, ts: Date.now() }); }} />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {!isMobile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3, duration: 0.8 }} className="desktop-only absolute bottom-8 z-[200] pointer-events-auto" style={{ left: '72px' }}>
          <div className="flex items-center gap-5 text-[9px] font-mono tracking-widest text-[var(--text-muted)] opacity-60">
            <div className="flex gap-2 items-center" title="Cursor coordinates (hover over map)"><span>CURSOR</span><span ref={coordsDisplayRef} className="text-[var(--gold-primary)] font-bold tabular-nums">—</span></div>
            <div className="flex gap-2 items-center" title="Reverse-geocoded location name"><span>LOCATION</span><span className="text-[var(--cyan-primary)] truncate max-w-[200px]">{locationLabel || 'HOVER MAP'}</span></div>
            <div className="flex gap-2 items-center" title="Current zoom level"><span>ZOOM</span><span className="text-[var(--gold-primary)] font-bold tabular-nums">{mapView.zoom.toFixed(1)}</span></div>
          </div>
        </motion.div>
      )}

      {(regionDossier || dossierLoading) && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-16 md:top-20 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[300] md:w-[480px] max-h-[65vh] overflow-y-auto styled-scrollbar">
          <div className="glass-panel p-5 osiris-glow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-mono font-bold text-[var(--gold-primary)] tracking-wider">REGION DOSSIER</h2>
              <button onClick={() => { setRegionDossier(null); setDossierLoading(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">✕</button>
            </div>
            {dossierLoading ? (
              <div className="text-center py-8"><div className="w-5 h-5 border-2 border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" /><span className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest">COMPILING INTEL...</span></div>
            ) : regionDossier && (
              <div className="space-y-3">
                <div><div className="hud-label mb-0.5">LOCATION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.location?.display_name}</div></div>
                {regionDossier.country && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><div className="hud-label mb-0.5">COUNTRY</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.flag} {regionDossier.country.name}</div></div>
                    <div><div className="hud-label mb-0.5">CAPITAL</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.capital}</div></div>
                    <div><div className="hud-label mb-0.5">POPULATION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.population?.toLocaleString()}</div></div>
                    <div><div className="hud-label mb-0.5">REGION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.subregion || regionDossier.country.region}</div></div>
                    <div><div className="hud-label mb-0.5">LANGUAGES</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.languages?.join(', ')}</div></div>
                    <div><div className="hud-label mb-0.5">AREA</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.area?.toLocaleString()} km²</div></div>
                  </div>
                )}
                {regionDossier.head_of_state && (<div><div className="hud-label mb-0.5">HEAD OF STATE</div><div className="text-xs text-[var(--gold-primary)]">{regionDossier.head_of_state.name}</div><div className="text-[9px] text-[var(--text-muted)]">{regionDossier.head_of_state.position}</div></div>)}
                {regionDossier.wikipedia && (<div><div className="hud-label mb-1">INTELLIGENCE BRIEF</div><div className="flex gap-3">{regionDossier.wikipedia.thumbnail && <img src={regionDossier.wikipedia.thumbnail} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />}<p className="text-[9px] text-[var(--text-secondary)] leading-relaxed">{regionDossier.wikipedia.extract}</p></div></div>)}
              </div>
            )}
          </div>
        </motion.div>
      )}

      <CameraViewer camera={activeCamera} onClose={() => setActiveCamera(null)} onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} />

      {drawMode && (<DrawHud mode={drawMode} progress={drawProgress} onUndo={() => sendDraw('undo')} onFinish={() => sendDraw('finish')} onCancel={() => { sendDraw('cancel'); setDrawMode(null); setDrawProgress(null); }} />)}

      {showDrawing && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 z-[400] w-80 pointer-events-auto">
          <DrawingToolbar drawMode={drawMode} onSetDrawMode={setDrawMode} progress={drawProgress} polygons={drawnPolygons} onDeletePolygon={(id) => setDrawnPolygons(p => p.filter(x => x.id !== id))} onClearAll={() => { setDrawnPolygons([]); setSelectedPolygon(null); }} onExportGeoJSON={handleExportGeoJSON} selectedPolygon={selectedPolygon} onSelectPolygon={setSelectedPolygon} onRenamePolygon={(id, name) => setDrawnPolygons(p => p.map(x => x.id === id ? { ...x, name } : x))} data={data} onLocateEntity={(lat, lng) => setFlyToLocation({ lat, lng, zoom: 12, ts: Date.now() })} watched={watched} onToggleWatch={toggleWatch} watchEvents={watchEvents} />
        </div>
      )}

      <div className="vignette absolute inset-0 pointer-events-none z-[2]" />
      <div className="crt-scanlines absolute inset-0 pointer-events-none z-[3] opacity-[0.02]" />
      {[
        { pos: 'top-0 left-0', vAnchor: 'top-0', hAnchor: 'left-0', hGrad: 'bg-gradient-to-r', vGrad: 'bg-gradient-to-b' },
        { pos: 'top-0 right-0', vAnchor: 'top-0', hAnchor: 'right-0', hGrad: 'bg-gradient-to-l', vGrad: 'bg-gradient-to-b' },
        { pos: 'bottom-0 left-0', vAnchor: 'bottom-0', hAnchor: 'left-0', hGrad: 'bg-gradient-to-r', vGrad: 'bg-gradient-to-t' },
        { pos: 'bottom-0 right-0', vAnchor: 'bottom-0', hAnchor: 'right-0', hGrad: 'bg-gradient-to-l', vGrad: 'bg-gradient-to-t' },
      ].map((c, i) => (
        <div key={i} className={`absolute ${c.pos} w-16 h-16 pointer-events-none z-[1]`}>
          <div className={`absolute ${c.vAnchor} ${c.hAnchor} w-full h-[1px] ${c.hGrad} from-[var(--gold-primary)]/30 to-transparent`} />
          <div className={`absolute ${c.vAnchor} ${c.hAnchor} w-[1px] h-full ${c.vGrad} from-[var(--gold-primary)]/30 to-transparent`} />
        </div>
      ))}

      <KeyboardShortcuts />
      <GlobalStatusBar />

      <div className="desktop-only absolute bottom-[26px] right-5 z-[200] pointer-events-none text-[9px] font-mono text-[var(--text-muted)] opacity-50 tracking-widest" title="Press ? to see all keyboard shortcuts">
        Press <span className="text-[var(--gold-primary)] opacity-80">?</span> for shortcuts · <span className="text-[var(--gold-primary)] opacity-80">F</span> fullscreen · <span className="text-[var(--gold-primary)] opacity-80">R</span> reset view
      </div>
    </main>
  );
}