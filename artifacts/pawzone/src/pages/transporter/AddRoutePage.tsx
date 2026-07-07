import { useState, useEffect, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import {
  Truck, Clock, ChevronUp, ChevronDown, X, Check, MapPin,
  ArrowRight, Edit2, CheckCircle2, Flag
} from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const KERALA_DISTRICTS: Record<string, string[]> = {
  "Thiruvananthapuram": ["Thiruvananthapuram", "Neyyattinkara", "Attingal", "Varkala", "Nedumangad", "Kazhakoottam", "Balaramapuram"],
  "Kollam": ["Kollam", "Punalur", "Karunagappally", "Kottarakkara", "Paravur", "Chavara", "Kundara"],
  "Pathanamthitta": ["Pathanamthitta", "Adoor", "Thiruvalla", "Ranni", "Pandalam", "Konni", "Kozhencherry"],
  "Alappuzha": ["Alappuzha", "Chengannur", "Mavelikkara", "Kayamkulam", "Haripad", "Cherthala", "Kuttanad"],
  "Kottayam": ["Kottayam", "Pala", "Changanassery", "Ettumanoor", "Vaikom", "Kanjirappally", "Erattupetta"],
  "Idukki": ["Idukki", "Thodupuzha", "Munnar", "Kattappana", "Adimali", "Devikulam", "Kumily"],
  "Ernakulam": ["Kochi", "Aluva", "Perumbavoor", "Angamaly", "North Paravur", "Kothamangalam", "Muvattupuzha", "Thrippunithura", "Tripunithura", "Kakkanad", "Kadavanthara", "Panampally"],
  "Thrissur": ["Thrissur", "Chalakudy", "Kunnamkulam", "Guruvayur", "Irinjalakuda", "Kodungallur", "Mala"],
  "Palakkad": ["Palakkad", "Ottappalam", "Mannarkkad", "Chittur", "Pattambi", "Shornur", "Alathur"],
  "Malappuram": ["Malappuram", "Manjeri", "Tirur", "Perinthalmanna", "Ponnani", "Kondotty", "Kalpetta"],
  "Kozhikode": ["Kozhikode", "Vadakara", "Koyilandy", "Feroke", "Ramanattukara", "Mukkam", "Koduvally"],
  "Wayanad": ["Kalpetta", "Sulthan Bathery", "Mananthavady", "Vythiri", "Ambalavayal", "Pulpally"],
  "Kannur": ["Kannur", "Thalassery", "Iritty", "Payyanur", "Mattannur", "Sreekandapuram", "Panoor"],
  "Kasaragod": ["Kasaragod", "Kanhangad", "Hosdurg", "Nileshwar", "Bekal", "Cheruvathur", "Uppala"],
};

const ALL_DISTRICTS = Object.keys(KERALA_DISTRICTS);
const DRAFT_KEY = "pawzone_route_draft";

function getDistrictForTown(town: string): string | null {
  for (const [district, towns] of Object.entries(KERALA_DISTRICTS)) {
    if (towns.includes(town)) return district;
  }
  return null;
}

function reconstructFromFlat(allTowns: string[]): { districts: string[]; townsByDistrict: Record<string, string[]> } {
  const districts: string[] = [];
  const townsByDistrict: Record<string, string[]> = {};
  for (const town of allTowns) {
    const d = getDistrictForTown(town);
    if (d) {
      if (!districts.includes(d)) {
        districts.push(d);
        townsByDistrict[d] = [];
      }
      townsByDistrict[d].push(town);
    }
  }
  return { districts, townsByDistrict };
}

interface Draft {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  selectedDistricts: string[];
  townsByDistrict: Record<string, string[]>;
  currentStep: number;
  editingId: number | null;
}

function loadDraft(): Partial<Draft> {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveDraft(d: Draft) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {}
}

function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
}

function moveItem<T>(arr: T[], idx: number, dir: "up" | "down"): T[] {
  const next = [...arr];
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= next.length) return next;
  [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
  return next;
}

function removeItem<T>(arr: T[], idx: number): T[] {
  return arr.filter((_, i) => i !== idx);
}

function ProgressBar({ step, total, label }: { step: number; total: number; label: string }) {
  const pct = total <= 1 ? 100 : Math.round((step / (total - 1)) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-teal-700">{label}</span>
        <span className="text-gray-400">Step {step + 1} of {total}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function OrderedChip({
  number,
  label,
  onMoveUp,
  onMoveDown,
  onRemove,
  disableUp,
  disableDown,
}: {
  number: number;
  label: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  disableUp: boolean;
  disableDown: boolean;
}) {
  return (
    <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2.5 group">
      <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
        {number}
      </div>
      <span className="flex-1 text-sm font-medium text-gray-800 min-w-0 truncate">{label}</span>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button type="button" onClick={onMoveUp} disabled={disableUp}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-teal-700 hover:bg-teal-100 disabled:opacity-25 transition-colors">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onMoveDown} disabled={disableDown}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-teal-700 hover:bg-teal-100 disabled:opacity-25 transition-colors">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onRemove}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AddRoutePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [matchEdit, paramsEdit] = useRoute("/transporter/routes/:id/edit");
  const editingId = matchEdit && paramsEdit ? Number(paramsEdit.id) : null;
  const isEditMode = editingId !== null && !Number.isNaN(editingId);

  const [dayOfWeek, setDayOfWeek] = useState("Monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [townsByDistrict, setTownsByDistrict] = useState<Record<string, string[]>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);

  const totalSteps = 2 + selectedDistricts.length;
  const stepLabel =
    currentStep === 0 ? "Select Districts" :
    currentStep <= selectedDistricts.length ? `Towns — ${selectedDistricts[currentStep - 1]}` :
    "Review & Confirm";

  const flatTowns = selectedDistricts.flatMap(d => townsByDistrict[d] ?? []);

  const draftState: Draft = {
    dayOfWeek, startTime, endTime,
    selectedDistricts, townsByDistrict, currentStep,
    editingId,
  };

  useEffect(() => {
    const draft = loadDraft();
    if (draft.editingId === editingId && draft.selectedDistricts?.length) {
      if (draft.dayOfWeek) setDayOfWeek(draft.dayOfWeek);
      if (draft.startTime) setStartTime(draft.startTime);
      if (draft.endTime) setEndTime(draft.endTime);
      setSelectedDistricts(draft.selectedDistricts ?? []);
      setTownsByDistrict(draft.townsByDistrict ?? {});
      setCurrentStep(draft.currentStep ?? 0);
    }
  }, []);

  useEffect(() => {
    if (!isEditMode || editingId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("pawzone_token");
        const res = await fetch("/api/transporter/routes", {
          headers: { Authorization: `Bearer ${token ?? ""}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load route");
        const list: any[] = await res.json();
        const r = list.find((x) => Number(x.id) === editingId);
        if (cancelled) return;
        if (r) {
          const draft = loadDraft();
          if (draft.editingId === editingId && draft.selectedDistricts?.length) {
            setLoadingExisting(false);
            return;
          }
          const allTowns = [r.startCity, ...(Array.isArray(r.stops) ? r.stops : []), r.endCity].filter(Boolean);
          const { districts, townsByDistrict: tbd } = reconstructFromFlat(allTowns);
          setDayOfWeek(r.dayOfWeek ?? "Monday");
          setStartTime(r.startTime ?? "09:00");
          setEndTime(r.endTime ?? "17:00");
          setSelectedDistricts(districts);
          setTownsByDistrict(tbd);
        } else {
          toast({ variant: "destructive", title: "Not found", description: "Route not found." });
          setLocation("/transporter");
        }
      } catch (err: any) {
        if (!cancelled) toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to load route" });
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEditMode, editingId, setLocation, toast]);

  useEffect(() => {
    if (!loadingExisting) saveDraft(draftState);
  }, [dayOfWeek, startTime, endTime, selectedDistricts, townsByDistrict, currentStep, loadingExisting]);

  const toggleDistrict = (d: string) => {
    setSelectedDistricts(prev => {
      if (prev.includes(d)) {
        const next = prev.filter(x => x !== d);
        setTownsByDistrict(tbd => {
          const copy = { ...tbd };
          delete copy[d];
          return copy;
        });
        return next;
      }
      return [...prev, d];
    });
  };

  const moveDistrict = (idx: number, dir: "up" | "down") => {
    setSelectedDistricts(prev => moveItem(prev, idx, dir));
  };

  const removeDistrict = (idx: number) => {
    const d = selectedDistricts[idx];
    setSelectedDistricts(prev => removeItem(prev, idx));
    setTownsByDistrict(tbd => {
      const copy = { ...tbd };
      delete copy[d];
      return copy;
    });
  };

  const toggleTown = (district: string, town: string) => {
    setTownsByDistrict(prev => {
      const current = prev[district] ?? [];
      if (current.includes(town)) {
        return { ...prev, [district]: current.filter(t => t !== town) };
      }
      return { ...prev, [district]: [...current, town] };
    });
  };

  const moveTown = (district: string, idx: number, dir: "up" | "down") => {
    setTownsByDistrict(prev => ({
      ...prev,
      [district]: moveItem(prev[district] ?? [], idx, dir),
    }));
  };

  const removeTown = (district: string, idx: number) => {
    setTownsByDistrict(prev => ({
      ...prev,
      [district]: removeItem(prev[district] ?? [], idx),
    }));
  };

  const handleSubmit = async () => {
    if (flatTowns.length < 2) {
      toast({ variant: "destructive", title: "Route too short", description: "Add at least 2 towns to your route." });
      return;
    }
    const payload = {
      dayOfWeek,
      startCity: flatTowns[0],
      endCity: flatTowns[flatTowns.length - 1],
      startTime,
      endTime,
      stops: flatTowns.slice(1, -1),
    };
    setSubmitting(true);
    try {
      const token = localStorage.getItem("pawzone_token");
      const url = isEditMode && editingId !== null
        ? `/api/transporter/routes/${editingId}`
        : "/api/transporter/routes";
      const res = await fetch(url, {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to save route");
      }
      clearDraft();
      toast({ title: isEditMode ? "Route updated!" : "Route saved!", description: "Your delivery route has been saved." });
      setLocation("/transporter");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to save route" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading route...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-4 pt-4 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BackButton />
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">
                {isEditMode ? "Edit Delivery Route" : "Add Delivery Route"}
              </h1>
              <p className="text-teal-100 text-xs">Plan your daily stops district by district</p>
            </div>
          </div>
          <ProgressBar step={currentStep} total={totalSteps} label={stepLabel} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-2">

        {currentStep === 0 && (
          <StepDistricts
            dayOfWeek={dayOfWeek}
            setDayOfWeek={setDayOfWeek}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            setEndTime={setEndTime}
            selectedDistricts={selectedDistricts}
            onToggle={toggleDistrict}
            onMove={moveDistrict}
            onRemove={removeDistrict}
            onNext={() => {
              if (!dayOfWeek) { toast({ variant: "destructive", title: "Day required", description: "Please select a day of week." }); return; }
              if (selectedDistricts.length === 0) { toast({ variant: "destructive", title: "Select districts", description: "Select at least one district you travel through." }); return; }
              setCurrentStep(1);
            }}
          />
        )}

        {currentStep > 0 && currentStep <= selectedDistricts.length && (
          <StepTowns
            districtName={selectedDistricts[currentStep - 1]}
            districtIndex={currentStep - 1}
            totalDistricts={selectedDistricts.length}
            allTowns={KERALA_DISTRICTS[selectedDistricts[currentStep - 1]] ?? []}
            selectedTowns={townsByDistrict[selectedDistricts[currentStep - 1]] ?? []}
            onToggle={(town) => toggleTown(selectedDistricts[currentStep - 1], town)}
            onMove={(idx, dir) => moveTown(selectedDistricts[currentStep - 1], idx, dir)}
            onRemove={(idx) => removeTown(selectedDistricts[currentStep - 1], idx)}
            onBack={() => setCurrentStep(s => s - 1)}
            onNext={() => {
              const towns = townsByDistrict[selectedDistricts[currentStep - 1]] ?? [];
              if (towns.length === 0) {
                toast({ variant: "destructive", title: "Select towns", description: `Pick at least one town in ${selectedDistricts[currentStep - 1]}.` });
                return;
              }
              setCurrentStep(s => s + 1);
            }}
            isLastDistrict={currentStep === selectedDistricts.length}
          />
        )}

        {currentStep === selectedDistricts.length + 1 && (
          <StepPreview
            selectedDistricts={selectedDistricts}
            townsByDistrict={townsByDistrict}
            flatTowns={flatTowns}
            dayOfWeek={dayOfWeek}
            startTime={startTime}
            endTime={endTime}
            onEdit={() => setCurrentStep(1)}
            onConfirm={handleSubmit}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}

function StepDistricts({
  dayOfWeek, setDayOfWeek,
  startTime, setStartTime,
  endTime, setEndTime,
  selectedDistricts, onToggle, onMove, onRemove,
  onNext,
}: {
  dayOfWeek: string; setDayOfWeek: (v: string) => void;
  startTime: string; setStartTime: (v: string) => void;
  endTime: string; setEndTime: (v: string) => void;
  selectedDistricts: string[];
  onToggle: (d: string) => void;
  onMove: (idx: number, dir: "up" | "down") => void;
  onRemove: (idx: number) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4 pt-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">Day of Week *</Label>
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger className="rounded-xl border-gray-200 h-11">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" /> Start Time
            </Label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="rounded-xl border-gray-200 h-11" />
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" /> End Time
            </Label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="rounded-xl border-gray-200 h-11" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Select Districts</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tap the districts you travel through — order matters</p>
          </div>
          {selectedDistricts.length > 0 && (
            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {selectedDistricts.length} selected
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {ALL_DISTRICTS.map(d => {
            const isSelected = selectedDistricts.includes(d);
            const order = selectedDistricts.indexOf(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => onToggle(d)}
                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 text-left ${
                  isSelected
                    ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                    : "bg-gray-50 border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50"
                }`}
              >
                {isSelected ? (
                  <span className="w-5 h-5 rounded-full bg-white text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {order + 1}
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" />
                )}
                <span className="truncate text-xs sm:text-sm">{d}</span>
              </button>
            );
          })}
        </div>

        {selectedDistricts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Travel Order</p>
            <div className="space-y-1.5">
              {selectedDistricts.map((d, idx) => (
                <OrderedChip
                  key={d}
                  number={idx + 1}
                  label={d}
                  onMoveUp={() => onMove(idx, "up")}
                  onMoveDown={() => onMove(idx, "down")}
                  onRemove={() => onRemove(idx)}
                  disableUp={idx === 0}
                  disableDown={idx === selectedDistricts.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={onNext}
        disabled={selectedDistricts.length === 0 || !dayOfWeek}
        className="w-full h-12 rounded-xl text-base font-bold bg-teal-700 hover:bg-emerald-600 flex items-center gap-2"
      >
        Next — Select Towns <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function StepTowns({
  districtName, districtIndex, totalDistricts,
  allTowns, selectedTowns,
  onToggle, onMove, onRemove,
  onBack, onNext, isLastDistrict,
}: {
  districtName: string;
  districtIndex: number;
  totalDistricts: number;
  allTowns: string[];
  selectedTowns: string[];
  onToggle: (t: string) => void;
  onMove: (idx: number, dir: "up" | "down") => void;
  onRemove: (idx: number) => void;
  onBack: () => void;
  onNext: () => void;
  isLastDistrict: boolean;
}) {
  return (
    <div className="space-y-4 pt-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
            {districtIndex + 1}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base">{districtName}</h2>
            <p className="text-xs text-gray-500">District {districtIndex + 1} of {totalDistricts}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4 mt-1">Tap the towns you stop at — selection order is travel order</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {allTowns.map(town => {
            const isSelected = selectedTowns.includes(town);
            const order = selectedTowns.indexOf(town);
            return (
              <button
                key={town}
                type="button"
                onClick={() => onToggle(town)}
                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 text-left ${
                  isSelected
                    ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                    : "bg-gray-50 border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50"
                }`}
              >
                {isSelected ? (
                  <span className="w-5 h-5 rounded-full bg-white text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {order + 1}
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" />
                )}
                <span className="truncate text-xs sm:text-sm">{town}</span>
              </button>
            );
          })}
        </div>

        {selectedTowns.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stop Order in {districtName}</p>
            <div className="space-y-1.5">
              {selectedTowns.map((town, idx) => (
                <OrderedChip
                  key={town + idx}
                  number={idx + 1}
                  label={town}
                  onMoveUp={() => onMove(idx, "up")}
                  onMoveDown={() => onMove(idx, "down")}
                  onRemove={() => onRemove(idx)}
                  disableUp={idx === 0}
                  disableDown={idx === selectedTowns.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl font-semibold">
          ← Back
        </Button>
        <Button
          onClick={onNext}
          disabled={selectedTowns.length === 0}
          className="flex-1 h-12 rounded-xl font-bold bg-teal-700 hover:bg-emerald-600"
        >
          {isLastDistrict ? "Preview Route →" : `Next: ${""} →`}
        </Button>
      </div>
    </div>
  );
}

function StepPreview({
  selectedDistricts, townsByDistrict, flatTowns,
  dayOfWeek, startTime, endTime,
  onEdit, onConfirm, submitting,
}: {
  selectedDistricts: string[];
  townsByDistrict: Record<string, string[]>;
  flatTowns: string[];
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  onEdit: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  let globalNum = 0;

  return (
    <div className="space-y-4 pt-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-5 h-5 text-teal-600" />
          <h2 className="font-bold text-gray-900 text-base">Route Preview</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 mb-4">
          <span className="bg-teal-50 text-teal-700 font-semibold px-2.5 py-1 rounded-lg">{dayOfWeek}</span>
          <span>{startTime} – {endTime}</span>
          <span>{flatTowns.length} stops total</span>
        </div>

        <div className="space-y-0">
          {selectedDistricts.map((district, dIdx) => {
            const towns = townsByDistrict[district] ?? [];
            return (
              <div key={district}>
                <div className="flex items-center gap-2 mb-2 mt-3 first:mt-0">
                  <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {dIdx + 1}
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{district}</span>
                </div>
                <div className="ml-3 border-l-2 border-teal-200 pl-4 space-y-1.5">
                  {towns.map((town, tIdx) => {
                    globalNum++;
                    const num = globalNum;
                    const isFirst = dIdx === 0 && tIdx === 0;
                    const isLast = dIdx === selectedDistricts.length - 1 && tIdx === towns.length - 1;
                    return (
                      <div key={town + tIdx} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border ${
                        isFirst ? "bg-green-50 border-green-200" :
                        isLast ? "bg-red-50 border-red-200" :
                        "bg-teal-50 border-teal-100"
                      }`}>
                        {isFirst ? (
                          <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : isLast ? (
                          <Flag className="w-4 h-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            isFirst ? "bg-green-600 text-white" :
                            isLast ? "bg-red-500 text-white" :
                            "bg-teal-600 text-white"
                          }`}>{num}</div>
                        )}
                        <span className={`text-sm font-medium ${
                          isFirst ? "text-green-800" : isLast ? "text-red-800" : "text-gray-800"
                        }`}>
                          {town}
                          {isFirst && <span className="ml-1.5 text-[10px] font-bold text-green-600 uppercase">Start</span>}
                          {isLast && <span className="ml-1.5 text-[10px] font-bold text-red-500 uppercase">End</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {dIdx < selectedDistricts.length - 1 && (
                  <div className="flex items-center gap-2 my-2 ml-3">
                    <div className="flex-1 border-t border-dashed border-gray-200" />
                    <span className="text-[10px] text-gray-400 font-medium">{selectedDistricts[dIdx + 1]}</span>
                    <div className="flex-1 border-t border-dashed border-gray-200" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onEdit} className="flex-1 h-12 rounded-xl font-semibold flex items-center gap-2">
          <Edit2 className="w-4 h-4" /> Edit Route
        </Button>
        <Button
          onClick={onConfirm}
          disabled={submitting || flatTowns.length < 2}
          className="flex-1 h-12 rounded-xl font-bold bg-teal-700 hover:bg-emerald-600 flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          {submitting ? "Saving..." : "Confirm Route"}
        </Button>
      </div>
    </div>
  );
}

