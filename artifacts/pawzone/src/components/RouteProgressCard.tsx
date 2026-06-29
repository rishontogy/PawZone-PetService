import { useState } from "react";
import { MapPin, Flag, X, Navigation } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface RouteInfo {
  pickupPoint: string;
  deliveryPoint: string;
  stops: string[];
  direct: boolean;
}

async function fetchRouteInfo(orderId: number, token: string): Promise<RouteInfo> {
  const res = await fetch(`/api/orders/${orderId}/route-info`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load route info");
  return res.json();
}

function getDisplayedMarkers(stops: string[]): number[] {
  const n = stops.length;
  if (n === 0) return [];
  if (n <= 5) return stops.map((_, i) => i + 1);
  const indices: number[] = [];
  for (let i = 1; i <= n; i++) {
    if (i % 2 === 0) indices.push(i);
  }
  return indices;
}

interface Props {
  orderId: number;
  pickupPoint: string;
  deliveryPoint: string;
}

export function RouteProgressCard({ orderId, pickupPoint, deliveryPoint }: Props) {
  const { token } = useAuth();
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    if (loaded || loading || !token) return;
    setLoading(true);
    try {
      const data = await fetchRouteInfo(orderId, token);
      setRouteInfo(data);
      setLoaded(true);
    } catch {
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (!loaded) await load();
    setModalOpen(true);
  };

  const stops = routeInfo?.stops ?? [];
  const isDirect = routeInfo?.direct ?? stops.length === 0;
  const displayedMarkers = getDisplayedMarkers(stops);

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-4 hover:shadow-md hover:border-teal-300 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
      >
        {loading && !loaded ? (
          <div className="flex items-center justify-center py-3">
            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" /> Route Overview
              </p>
              <p className="text-xs text-teal-500 group-hover:text-teal-700 transition-colors">Tap for full route →</p>
            </div>

            <div className="relative flex items-center justify-center py-2">
              <svg
                viewBox="0 0 320 80"
                className="w-full h-16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <path
                  d="M 20 40 C 60 10, 100 70, 160 40 C 220 10, 260 70, 300 40"
                  stroke="#d1fae5"
                  strokeWidth="18"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 20 40 C 60 10, 100 70, 160 40 C 220 10, 260 70, 300 40"
                  stroke="#10b981"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="none"
                  fill="none"
                />

                <circle cx="20" cy="40" r="10" fill="#065f46" />
                <text x="20" y="44" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">P</text>

                {isDirect ? (
                  <g>
                    <rect x="118" y="28" width="44" height="24" rx="8" fill="#ecfdf5" stroke="#6ee7b7" strokeWidth="1.5" />
                    <text x="140" y="43" textAnchor="middle" fill="#059669" fontSize="9" fontWeight="600">Direct</text>
                  </g>
                ) : (
                  displayedMarkers.map((num, idx) => {
                    const total = displayedMarkers.length;
                    const spread = Math.min(total, 6);
                    const startX = 160 - ((spread - 1) * 40) / 2;
                    const cx = total === 1 ? 160 : startX + idx * (total > 1 ? (240 / (total + 1)) : 0);
                    const waveY = Math.sin(((cx - 20) / 280) * Math.PI * 2) * 15;
                    const cy = 40 - waveY;
                    return (
                      <g key={num}>
                        <circle cx={cx} cy={cy} r="11" fill="#047857" stroke="white" strokeWidth="2" />
                        <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
                          {num}
                        </text>
                      </g>
                    );
                  })
                )}

                <circle cx="300" cy="40" r="10" fill="#134e4a" />
                <text x="300" y="44" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">D</text>
              </svg>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-green-700 font-semibold">
                <div className="w-4 h-4 rounded-full bg-green-800 flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">P</span>
                </div>
                {pickupPoint}
              </div>
              {!isDirect && stops.length > 0 && (
                <div className="text-teal-500 text-[10px] font-medium">
                  {stops.length} stop{stops.length !== 1 ? "s" : ""}
                </div>
              )}
              <div className="flex items-center gap-1 text-teal-900 font-semibold">
                {deliveryPoint}
                <div className="w-4 h-4 rounded-full bg-teal-900 flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">D</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </button>

      {modalOpen && (
        <RouteModal
          pickupPoint={routeInfo?.pickupPoint ?? pickupPoint}
          deliveryPoint={routeInfo?.deliveryPoint ?? deliveryPoint}
          stops={stops}
          isDirect={isDirect}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

function RouteModal({
  pickupPoint,
  deliveryPoint,
  stops,
  isDirect,
  onClose,
}: {
  pickupPoint: string;
  deliveryPoint: string;
  stops: string[];
  isDirect: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-md md:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-teal-700 to-emerald-600 rounded-t-3xl sm:rounded-t-3xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Navigation className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-bold text-white text-base">Transport Route</h3>
              <p className="text-teal-100 text-xs">
                {isDirect ? "Direct route — no intermediate stops" : `${stops.length} intermediate stop${stops.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          <div className="relative">
            <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gradient-to-b from-green-600 via-teal-500 to-teal-800" />

            <div className="space-y-0">
              <RouteStop
                icon={
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shadow-md ring-4 ring-green-100">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                }
                label="Pickup"
                name={pickupPoint}
                labelColor="text-green-700"
                bgColor="bg-green-50 border-green-200"
              />

              {isDirect ? (
                <div className="ml-14 my-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Direct Route</p>
                    <p className="text-xs text-emerald-600">No intermediate stops on this journey</p>
                  </div>
                </div>
              ) : (
                stops.map((stop, idx) => (
                  <RouteStop
                    key={idx}
                    icon={
                      <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center shadow-sm ring-4 ring-teal-50">
                        <span className="text-white text-sm font-bold">{idx + 1}</span>
                      </div>
                    }
                    label={`Stop ${idx + 1}`}
                    name={stop}
                    labelColor="text-teal-600"
                    bgColor="bg-teal-50 border-teal-100"
                  />
                ))
              )}

              <RouteStop
                icon={
                  <div className="w-10 h-10 rounded-full bg-teal-900 flex items-center justify-center shadow-md ring-4 ring-teal-100">
                    <Flag className="w-5 h-5 text-white" />
                  </div>
                }
                label="Delivery"
                name={deliveryPoint}
                labelColor="text-teal-900"
                bgColor="bg-teal-50 border-teal-200"
                isLast
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteStop({
  icon,
  label,
  name,
  labelColor,
  bgColor,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  labelColor: string;
  bgColor: string;
  isLast?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 ${isLast ? "" : "mb-4"}`}>
      <div className="relative z-10 flex-shrink-0">{icon}</div>
      <div className={`flex-1 border rounded-xl px-4 py-3 ${bgColor}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${labelColor}`}>{label}</p>
        <p className="font-bold text-gray-900 mt-0.5">{name}</p>
      </div>
    </div>
  );
}
