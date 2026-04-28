import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useCreateTransporterRoute } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Plus, X, MapPin, ArrowDown, Clock, Truck } from "lucide-react";

const CITIES = [
  "Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam",
  "Palakkad", "Alappuzha", "Malappuram", "Kottayam", "Kannur",
  "Kasaragod", "Wayanad", "Idukki", "Pathanamthitta",
];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function AddRoutePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [matchEdit, paramsEdit] = useRoute("/transporter/routes/:id/edit");
  const editingId = matchEdit && paramsEdit ? Number(paramsEdit.id) : null;
  const isEditMode = editingId !== null && !Number.isNaN(editingId);

  const [form, setForm] = useState({
    dayOfWeek: "",
    startCity: "",
    endCity: "",
    startTime: "09:00",
    endTime: "17:00",
  });
  const [stops, setStops] = useState<string[]>([]);
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
        });
        if (!res.ok) throw new Error("Failed to load route");
        const list: any[] = await res.json();
        const r = list.find((x) => Number(x.id) === editingId);
        if (cancelled) return;
        if (r) {
          setForm({
            dayOfWeek: r.dayOfWeek ?? "",
            startCity: r.startCity ?? "",
            endCity: r.endCity ?? "",
            startTime: r.startTime ?? "09:00",
            endTime: r.endTime ?? "17:00",
          });
          setStops(Array.isArray(r.stops) ? r.stops.filter((s: any) => typeof s === "string" && s) : []);
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

  const addStop = () => setStops([...stops, ""]);
  const updateStop = (idx: number, val: string) => setStops(stops.map((s, i) => (i === idx ? val : s)));
  const removeStop = (idx: number) => setStops(stops.filter((_, i) => i !== idx));

  const createRoute = useCreateTransporterRoute({
    mutation: {
      onSuccess: () => {
        toast({ title: "Route added!", description: "Your delivery route has been saved." });
        setLocation("/transporter");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to add route" });
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validStops = stops.filter(Boolean);
    const payload = {
      ...form,
      stops: validStops,
    };

    if (isEditMode && editingId !== null) {
      setSubmitting(true);
      try {
        const token = localStorage.getItem("pawzone_token");
        const res = await fetch(`/api/transporter/routes/${editingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token ?? ""}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to update route");
        }
        toast({ title: "Route updated!", description: "Your delivery route has been saved." });
        setLocation("/transporter");
      } catch (err: any) {
        toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to update route" });
      } finally {
        setSubmitting(false);
      }
    } else {
      createRoute.mutate({ data: payload as any });
    }
  };

  const allCities = [form.startCity, ...stops, form.endCity].filter(Boolean);
  const isPending = submitting || createRoute.isPending || loadingExisting;

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
                <p className="text-blue-100 text-sm mt-0.5">Configure your delivery schedule</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Day + Time */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Day of Week *</Label>
                  <Select value={form.dayOfWeek} onValueChange={(v) => setForm({ ...form, dayOfWeek: v })}>
                    <SelectTrigger className="rounded-xl border-gray-200">
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
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" /> End Time
                    </Label>
                    <Input
                      type="time"
                      className="rounded-xl border-gray-200"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Route builder */}
              <div className="space-y-2">
                <Label className="font-semibold text-gray-700 block">Route *</Label>
                <p className="text-xs text-gray-400 mb-3">Set start, optional stops, and end city</p>

                <div className="space-y-1">
                  {/* Start */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center w-6 flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <MapPin className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <Select value={form.startCity} onValueChange={(v) => setForm({ ...form, startCity: v })}>
                      <SelectTrigger className="flex-1 rounded-xl border-gray-200">
                        <SelectValue placeholder="Start location" />
                      </SelectTrigger>
                      <SelectContent>
                        {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stops */}
                  {stops.map((stop, idx) => (
                    <div key={idx}>
                      <div className="flex items-center gap-2 pl-2.5">
                        <ArrowDown className="w-3 h-3 text-gray-300 flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center w-6 flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold">
                            {idx + 1}
                          </div>
                        </div>
                        <Select value={stop} onValueChange={(v) => updateStop(idx, v)}>
                          <SelectTrigger className="flex-1 rounded-xl border-gray-200">
                            <SelectValue placeholder={`Stop ${idx + 1}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          onClick={() => removeStop(idx)}
                          className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add stop button */}
                  <div>
                    <div className="flex items-center gap-2 pl-2.5">
                      <ArrowDown className="w-3 h-3 text-gray-300 flex-shrink-0" />
                    </div>
                    <button
                      type="button"
                      onClick={addStop}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all w-full"
                    >
                      <Plus className="w-4 h-4" />
                      + Add Stop
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pl-2.5">
                    <ArrowDown className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  </div>

                  {/* End */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center w-6 flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                        <MapPin className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <Select value={form.endCity} onValueChange={(v) => setForm({ ...form, endCity: v })}>
                      <SelectTrigger className="flex-1 rounded-xl border-gray-200">
                        <SelectValue placeholder="End location" />
                      </SelectTrigger>
                      <SelectContent>
                        {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Route preview */}
              {allCities.length >= 2 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Route Preview</p>
                  <div className="flex flex-wrap items-center gap-1 text-sm">
                    {allCities.map((city, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                          idx === 0 ? "bg-green-100 text-green-700" :
                          idx === allCities.length - 1 ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>{city}</span>
                        {idx < allCities.length - 1 && <span className="text-gray-400">→</span>}
                      </span>
                    ))}
                  </div>
                  {form.startTime && form.endTime && (
                    <p className="text-xs text-blue-600 mt-2">
                      🕐 {form.startTime} – {form.endTime} on {form.dayOfWeek || "?"}
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                data-testid="button-save-route"
                className="w-full h-12 rounded-xl text-base font-bold bg-blue-600 hover:bg-blue-700"
                disabled={isPending || !form.dayOfWeek || !form.startCity || !form.endCity}
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
