import { useState } from "react";
import { useAdminGetUsers, useAdminApproveUser, useAdminBlockUser } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getStatusColor } from "@/lib/api";
import { Users, Search, CheckCircle, XCircle } from "lucide-react";

export function AdminUsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const { data, refetch } = useAdminGetUsers(
    { page, limit: 20, role: role || undefined, status: status || undefined },
    { query: { enabled: !!user } }
  );

  const approve = useAdminApproveUser({
    mutation: {
      onSuccess: () => { toast({ title: "User approved" }); refetch(); },
      onError: (err: any) => { toast({ variant: "destructive", title: "Error", description: err?.data?.error }); },
    },
  });

  const block = useAdminBlockUser({
    mutation: {
      onSuccess: () => { toast({ title: "User blocked" }); refetch(); },
    },
  });

  const users = data?.users ?? [];
  const filtered = search ? users.filter((u: any) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) : users;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Users className="w-6 h-6" /> User Management
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={role} onValueChange={(v) => { setRole(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="buyer">Buyers</SelectItem>
              <SelectItem value="seller">Sellers</SelectItem>
              <SelectItem value="transporter">Transporters</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Users ({data?.total ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((u: any) => (
                <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium truncate">{u.name}</p>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{u.role}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{u.email} · {u.phone}</p>
                    <p className="text-xs text-muted-foreground">{u.city}, Kerala</p>
                    {u.sellerId && <p className="text-xs font-mono text-primary">{u.sellerId}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-xs ${getStatusColor(u.status)}`}>{u.status}</Badge>
                    {u.status === "pending" && (
                      <Button size="sm" className="gap-1" onClick={() => approve.mutate({ id: u.id })}>
                        <CheckCircle className="w-3 h-3" /> Approve
                      </Button>
                    )}
                    {u.status === "approved" && u.role !== "admin" && (
                      <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => block.mutate({ id: u.id })}>
                        <XCircle className="w-3 h-3" /> Block
                      </Button>
                    )}
                    {u.status === "blocked" && (
                      <Button size="sm" variant="outline" onClick={() => approve.mutate({ id: u.id })}>
                        Unblock
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {data && data.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
