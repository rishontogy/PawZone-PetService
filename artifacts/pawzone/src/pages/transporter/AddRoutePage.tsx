import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateTransporterRoute } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";

const CITIES = ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Malappuram", "Kottayam", "Kannur"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function AddRoutePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({
    dayOfWeek: "",
    startCity: "",
    endCity: "",
    startTime: "09:00",
    endTime: "17:00",
  });

  const createRoute = useCreateTransporterRoute({
    mutation: {
      onSuccess: () => {
        toast({ title: "Route added!" });
        setLocation("/transporter");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error });
      },
    },
  });

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => setLocation("/transporter")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <Card>
          <CardHeader>
            <CardTitle>Add Delivery Route</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              createRoute.mutate({ data: form as any });
            }} className="space-y-4">
              <div className="space-y-1">
                <Label>Day of Week</Label>
                <Select value={form.dayOfWeek} onValueChange={(v) => setForm({ ...form, dayOfWeek: v })}>
                  <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>From City</Label>
                  <Select value={form.startCity} onValueChange={(v) => setForm({ ...form, startCity: v })}>
                    <SelectTrigger><SelectValue placeholder="From" /></SelectTrigger>
                    <SelectContent>
                      {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>To City</Label>
                  <Select value={form.endCity} onValueChange={(v) => setForm({ ...form, endCity: v })}>
                    <SelectTrigger><SelectValue placeholder="To" /></SelectTrigger>
                    <SelectContent>
                      {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Start Time</Label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>End Time</Label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createRoute.isPending || !form.dayOfWeek || !form.startCity || !form.endCity}>
                {createRoute.isPending ? "Adding..." : "Add Route"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
