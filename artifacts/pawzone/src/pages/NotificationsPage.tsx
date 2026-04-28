import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Bell, ChevronLeft, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

type Notif = {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  orderId?: number | null;
  createdAt: string;
};

export function NotificationsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("pawzone_token");
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: number) => {
    const token = localStorage.getItem("pawzone_token");
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token ?? ""}` },
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const onClickItem = async (n: Notif) => {
    if (!n.read) await markRead(n.id);
    if (n.orderId) {
      const role = (user as any)?.role;
      if (role === "buyer") setLocation(`/buyer/orders/${n.orderId}`);
      else if (role === "seller") setLocation(`/seller/orders`);
      else if (role === "transporter") setLocation(`/transporter`);
    }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-teal-600" /> Notifications
            </h1>
            <p className="text-sm text-gray-500">{unread} unread</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">You're all caught up.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onClickItem(n)}
                  className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                    !n.read ? "bg-teal-50/40" : ""
                  }`}
                  data-testid={`notif-${n.id}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    !n.read ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"
                  }`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-teal-600 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {items.some((n) => !n.read) && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={async () => {
                const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
                await Promise.all(unreadIds.map((id) => markRead(id)));
              }}
            >
              <Check className="w-4 h-4 mr-1.5" /> Mark all read
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
