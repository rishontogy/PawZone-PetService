import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Truck, MapPin } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function parseRouteText(text: string): { startCity: string; endCity: string; stops: string[] } {
  const tokens = text
    .split(/[\s,>\-→]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return { startCity: "", endCity: "", stops: [] };
  if (tokens.length === 1) return { startCity: tokens[0], endCity: tokens[0], stops: [] };
  return {
    startCity: tokens[0],
    endCity: tokens[tokens.length - 1],
    stops: tokens.slice(1, -1),
  };
}

export function AddRoutePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [matchEdit, paramsEdit] = useRoute("/transporter/routes/:id/edit");
  const editingId = matchEdit && paramsEdit ? Number(paramsEdit.id) : null;
  const isEditMode = editingId !== null && !Number.isNaN(editingId);

  const [dayOfWeek, setDayOfWeek] = useState("");
  const [routeText, setRouteText] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditMode || editingId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("pawzone_token");
        const res = await fetch(`/api/transporter/routes`, {
          headers: { Authorization: `Bearer ${token ?? ""}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load route");
        const list: any[] = await res.json();
        const r = list.find((x) => Number(x.id) === editingId);
        if (cancelled) return;
        if (r) {
          setDayOfWeek(r.dayOfWeek ?? "");
          setStartTime(r.startTime ?? "09:00");
          setEndTime(r.endTime ?? "17:00");
          const all = [r.startCity, ...(Array.isArray(r.stops) ? r.stops : []), r.endCity]
            .filter((s: any) => typeof s === "string" && s);
          setRouteText(all.join(" "));
        } else {
          toast({ variant: "destructive", title: "Not found", description: "Route not found." });
          setLocation("/transporter");
          return;
        }
      } catch (err: any) {
        if (!cancelled) {
          toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to load route" });
        }
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEditMode, editingId, setLocation, toast]);

  const parsed = parseRouteText(routeText);
  const allTokens = [parsed.startCity, ...parsed.stops, parsed.endCity].filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dayOfWeek) {
      toast({ variant: "destructive", title: "Day required", description: "Pick a weekday for this route." });
      return;
    }
    if (!parsed.startCity || allTokens.length < 2) {
      toast({
        variant: "destructive",
        title: "Route required",
        description: "Enter at least two locations separated by spaces (e.g. 'puthumana peroor kottayam').",
      });
      return;
    }

    const payload = {
      dayOfWeek,
      startCity: parsed.startCity,
      endCity: parsed.endCity,
      startTime,
      endTime,
      stops: parsed.stops,
    };

    setSubmitting(true);
    try {
      const token = localStorage.getItem("pawzone_token");
      const url = isEditMode && editingId !== null
        ? `/api/transporter/routes/${editingId}`
        : `/api/transporter/routes`;
      const method = isEditMode ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to save route");
      }
      toast({
        title: isEditMode ? "Route updated!" : "Route added!",
        description: "Your delivery route has been saved.",
      });
      setLocation("/transporter");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to save route" });
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = submitting || loadingExisting;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">{isEditMode ? "Edit Delivery Route" : "Add Delivery Route"}</CardTitle>
                <p className="text-blue-100 text-sm mt-0.5">One route per weekday — max 7 routes total</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Day of Week *</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger className="rounded-xl border-gray-200" data-testid="select-day">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" /> Start Time
                  </Label>
                  <Input
                    type="time"
                    className="rounded-xl border-gray-200"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" /> End Time
                  </Label>
                  <Input
                    type="time"
                    className="rounded-xl border-gray-200"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" /> Route *
                </Label>
                <p className="text-xs text-gray-500">
                  Type your stops separated by spaces — first stop is your starting point, last stop is your destination, everything in between are waypoints.
                </p>
                <Input
                  data-testid="input-route-text"
                  value={routeText}
                  onChange={(e) => setRouteText(e.target.value)}
                  placeholder="thiruvananthapuram kazhakuttom varkala kottayam"
                  className="rounded-xl border-gray-200"
                />
                <p className="text-xs text-gray-400">
                  Example: <span className="font-mono text-blue-600">puthumana peroor ettumanoor kottayam</span>
                </p>
              </div>

              {allTokens.length >= 2 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Route Preview</p>
                  <div className="flex flex-wrap items-center gap-1 text-sm">
                    {allTokens.map((city, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                          idx === 0 ? "bg-green-100 text-green-700" :
                          idx === allTokens.length - 1 ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>{city}</span>
                        {idx < allTokens.length - 1 && <span className="text-gray-400">→</span>}
                      </span>
                    ))}
                  </div>
                  {startTime && endTime && (
                    <p className="text-xs text-blue-600 mt-2">
                      🕐 {startTime} – {endTime} on {dayOfWeek || "?"}
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                data-testid="button-save-route"
                className="w-full h-12 rounded-xl text-base font-bold bg-blue-600 hover:bg-blue-700"
                disabled={isPending || !dayOfWeek || allTokens.length < 2}
              >
                {isPending ? (isEditMode ? "Saving..." : "Adding Route...") : (isEditMode ? "Save Changes" : "Save Route")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
