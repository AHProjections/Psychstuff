import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search, MapPin, Utensils, Calendar, Zap, Beer, X, ExternalLink,
  Heart, Repeat2, RefreshCw, AlertCircle, ChevronRight, Filter,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
export interface Place {
  id: string;
  name: string;
  type: 'restaurant' | 'event' | 'activity' | 'bar';
  lat: number;
  lng: number;
  description: string;
  tweetUrl: string;
  author: string;
  authorHandle: string;
  authorAvatar: string | null;
  postedAt: string;
  likes: number;
  retweets: number;
  address: string | null;
  tags: string[];
}

interface CityInfo {
  lat: number;
  lng: number;
  display?: string;
  name?: string;
}

interface ApiResponse {
  city: CityInfo;
  places: Place[];
  source: 'twitter' | 'mock';
  notice?: string;
}

type PlaceType = 'all' | 'restaurant' | 'event' | 'activity' | 'bar';
type DayFilter = 'today' | 'weekend' | 'week';

// ──────────────────────────────────────────────
// Constants & helpers
// ──────────────────────────────────────────────
const TYPE_CONFIG: Record<PlaceType, { label: string; icon: LucideIcon; color: string; markerColor: string }> = {
  all:        { label: 'All',         icon: MapPin,    color: 'bg-indigo-100 text-indigo-700',  markerColor: '#6366f1' },
  restaurant: { label: 'Food & Drink',icon: Utensils,  color: 'bg-orange-100 text-orange-700',  markerColor: '#f97316' },
  event:      { label: 'Events',      icon: Calendar,  color: 'bg-purple-100 text-purple-700',  markerColor: '#a855f7' },
  activity:   { label: 'Activities',  icon: Zap,       color: 'bg-green-100 text-green-700',    markerColor: '#22c55e' },
  bar:        { label: 'Bars',         icon: Beer,      color: 'bg-amber-100 text-amber-700',    markerColor: '#f59e0b' },
};

const DAY_OPTIONS: { value: DayFilter; label: string }[] = [
  { value: 'today',   label: 'Today' },
  { value: 'weekend', label: 'This Weekend' },
  { value: 'week',    label: 'This Week' },
];

function makeMarkerIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      transform:rotate(-45deg);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });
}

const markerIcons: Record<string, L.DivIcon> = {};
function getIcon(type: PlaceType) {
  if (!markerIcons[type]) {
    markerIcons[type] = makeMarkerIcon(TYPE_CONFIG[type]?.markerColor ?? '#6366f1');
  }
  return markerIcons[type];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────
function FlyToCity({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 13, { duration: 1.2 });
  }, [coords, map]);
  return null;
}

function PlaceCard({
  place,
  active,
  onClick,
}: {
  place: Place;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = TYPE_CONFIG[place.type] ?? TYPE_CONFIG.all;
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left p-4 rounded-xl border transition-all duration-150 group',
        active
          ? 'border-indigo-400 bg-indigo-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm',
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={clsx('p-2 rounded-lg flex-shrink-0', cfg.color)}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900 truncate text-sm">{place.name}</h3>
            <ChevronRight size={14} className="flex-shrink-0 text-gray-400 group-hover:text-indigo-500 transition-colors" />
          </div>
          {place.address && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{place.address}</p>
          )}
          <div className="flex gap-1 mt-1 flex-wrap">
            {place.tags.map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tweet text */}
      <p className="text-xs text-gray-600 mt-2 leading-relaxed line-clamp-3">{place.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span className="font-medium text-gray-700">{place.authorHandle || place.author}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Heart size={11} /> {place.likes.toLocaleString()}</span>
          <span className="flex items-center gap-1"><Repeat2 size={11} /> {place.retweets.toLocaleString()}</span>
          <span>{timeAgo(place.postedAt)}</span>
        </div>
      </div>
    </button>
  );
}

function MapPopupContent({ place }: { place: Place }) {
  const cfg = TYPE_CONFIG[place.type] ?? TYPE_CONFIG.all;
  const Icon = cfg.icon;
  return (
    <div className="w-64 font-sans">
      <div className="flex items-center gap-2 mb-2">
        <div className={clsx('p-1.5 rounded-lg', cfg.color)}>
          <Icon size={13} />
        </div>
        <span className="font-semibold text-sm text-gray-900 leading-tight">{place.name}</span>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-4">{place.description}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{place.authorHandle || place.author}</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5"><Heart size={10} /> {place.likes}</span>
          {place.tweetUrl !== '#' && (
            <a
              href={place.tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-indigo-600 hover:underline"
            >
              View post <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────
export default function CityMap() {
  const [cityInput, setCityInput] = useState('');
  const [submittedCity, setSubmittedCity] = useState('');
  const [typeFilter, setTypeFilter] = useState<PlaceType>('all');
  const [dayFilter, setDayFilter] = useState<DayFilter>('today');

  const [places, setPlaces] = useState<Place[]>([]);
  const [cityCenter, setCityCenter] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'twitter' | 'mock' | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchPlaces = useCallback(async (city: string, type: PlaceType, day: DayFilter) => {
    if (!city.trim()) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    setPlaces([]);
    setActiveId(null);
    try {
      const params = new URLSearchParams({ city, type, day });
      const res = await fetch(`/api/citymap/places?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }
      const data: ApiResponse = await res.json();
      setCityCenter([data.city.lat, data.city.lng]);
      setPlaces(data.places);
      setDataSource(data.source);
      if (data.notice) setNotice(data.notice);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;
    setSubmittedCity(cityInput.trim());
    fetchPlaces(cityInput.trim(), typeFilter, dayFilter);
  };

  // Re-fetch when filter changes (if a city is already set)
  useEffect(() => {
    if (submittedCity) fetchPlaces(submittedCity, typeFilter, dayFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, dayFilter]);

  // Scroll active card into view
  useEffect(() => {
    if (activeId && cardRefs.current[activeId]) {
      cardRefs.current[activeId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId]);

  const filteredPlaces = typeFilter === 'all' ? places : places.filter(p => p.type === typeFilter);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ── Top bar ── */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <MapPin size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm leading-tight">City Discovery</h1>
              <p className="text-xs text-gray-500 leading-tight">Trending on X/Twitter</p>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                placeholder="Search a city... (e.g. Austin, NYC, Paris)"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !cityInput.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>

          {/* Day filter */}
          <div className="flex gap-1 flex-shrink-0">
            {DAY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDayFilter(opt.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  dayFilter === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type filter pills */}
        <div className="max-w-7xl mx-auto mt-2.5 flex gap-2 flex-wrap">
          {(Object.keys(TYPE_CONFIG) as PlaceType[]).map(t => {
            const cfg = TYPE_CONFIG[t];
            const Icon = cfg.icon;
            const count = t === 'all' ? places.length : places.filter(p => p.type === t).length;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  typeFilter === t
                    ? `${cfg.color} border-transparent shadow-sm`
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                )}
              >
                <Icon size={12} />
                {cfg.label}
                {submittedCity && (
                  <span className={clsx(
                    'ml-0.5 px-1.5 py-0.5 rounded-full text-xs',
                    typeFilter === t ? 'bg-white/60' : 'bg-gray-100',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Notice banner ── */}
      {notice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs text-amber-800 flex-shrink-0">
          <AlertCircle size={13} className="flex-shrink-0" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} className="hover:text-amber-900">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Main content: map + sidebar ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-80 xl:w-96 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
            {/* Sidebar header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                {submittedCity ? (
                  <>
                    <h2 className="font-semibold text-gray-900 text-sm">{submittedCity}</h2>
                    <p className="text-xs text-gray-500">
                      {filteredPlaces.length} place{filteredPlaces.length !== 1 ? 's' : ''} found
                      {dataSource === 'twitter' && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-sky-600">
                          <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
                          Live from X
                        </span>
                      )}
                      {dataSource === 'mock' && (
                        <span className="ml-1.5 text-amber-600"> · Demo data</span>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Search a city to discover places</p>
                )}
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Hide sidebar"
              >
                <Filter size={14} />
              </button>
            </div>

            {/* Place list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <RefreshCw size={28} className="animate-spin mb-3" />
                  <p className="text-sm">Searching recent posts…</p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-4 bg-red-50 rounded-xl border border-red-200">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-xs text-red-600 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {!loading && !error && submittedCity && filteredPlaces.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <MapPin size={28} className="mb-3" />
                  <p className="text-sm text-center">No places found for this filter combination.</p>
                  <p className="text-xs text-center mt-1">Try a different type or day range.</p>
                </div>
              )}

              {!loading && filteredPlaces.map(place => (
                <div key={place.id} ref={el => { cardRefs.current[place.id] = el; }}>
                  <PlaceCard
                    place={place}
                    active={activeId === place.id}
                    onClick={() => setActiveId(place.id === activeId ? null : place.id)}
                  />
                </div>
              ))}

              {!submittedCity && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 px-4">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                    <Search size={28} className="text-indigo-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Discover your city</p>
                  <p className="text-xs mt-1 leading-relaxed">
                    Type a city name above and find the hottest restaurants, events, bars, and activities trending right now on X.
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          {/* Show sidebar button when hidden */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute top-3 left-3 z-[1000] bg-white border border-gray-200 shadow-md rounded-lg px-3 py-2 text-xs text-gray-700 flex items-center gap-1.5 hover:bg-gray-50"
            >
              <Filter size={13} /> Show places
            </button>
          )}

          <MapContainer
            center={cityCenter ?? [39.5, -98.35]}
            zoom={cityCenter ? 13 : 4}
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FlyToCity coords={cityCenter} />

            {filteredPlaces.map(place => (
              <Marker
                key={place.id}
                position={[place.lat, place.lng]}
                icon={getIcon(place.type as PlaceType)}
                eventHandlers={{
                  click: () => setActiveId(place.id),
                }}
              >
                <Popup maxWidth={280} className="city-map-popup">
                  <MapPopupContent place={place} />
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Empty state overlay on map */}
          {!submittedCity && !loading && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none z-[999]">
              <div className="bg-white/90 backdrop-blur rounded-2xl px-8 py-6 text-center shadow-lg max-w-xs">
                <MapPin size={32} className="text-indigo-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-800">Search a city to get started</p>
                <p className="text-xs text-gray-500 mt-1">Discover trending places from real X posts</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
