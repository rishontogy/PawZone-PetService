import { useState } from "react";
import { useAdminGetUsers, useAdminApproveUser, useAdminBlockUser } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getStatusColor } from "@/lib/api";
import { Users, Search, CheckCircle, XCircle, Phone, MapPin, Shield, ShoppingBag, Truck, FileText, ExternalLink } from "lucide-react";

const roleIcon = (role: string) => {
  if (role === "seller") return <ShoppingBag className="w-4 h-4" />;
  if (role === "transporter") return <Truck className="w-4 h-4" />;
  if (role === "admin") return <Shield className="w-4 h-4" />;
  return <Users className="w-4 h-4" />;
};

const roleColor = (role: string) => {
  if (role === "seller") return "bg-purple-100 text-purple-700 border-purple-200";
  if (role === "transporter") return "bg-blue-100 text-blue-700 border-blue-200";
  if (role === "admin") return "bg-red-100 text-red-700 border-red-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
};

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
      onSuccess: (_res, variables) => {
        const approvedUser = users.find((u: any) => u.id === variables.id);
        toast({ title: "User approved", description: `${approvedUser?.name} can now access their dashboard.` });
        refetch();
      },
      onError: (err: any) => { toast({ variant: "destructive", title: "Error", description: err?.data?.error }); },
    },
  });

  const block = useAdminBlockUser({
    mutation: {
      onSuccess: () => { toast({ title: "User blocked" }); refetch(); },
    },
  });

  const users = data?.users ?? [];
  const filtered = search
    ? users.filter((u: any) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search)
      )
    : users;

  const pendingCount = users.filter((u: any) => u.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <BackButton />
            <div className="flex-1 min-w-0 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users className="w-6 h-6" /> User Management
                </h1>
                <p className="text-gray-400 text-sm mt-0.5">Manage user accounts and approvals</p>
              </div>
              {pendingCount > 0 && (
                <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-sm px-3 py-1.5 shrink-0">
                  {pendingCount} pending
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Users", value: data?.total ?? 0, icon: <Users className="w-5 h-5 text-teal-600" />, bg: "bg-teal-50" },
            { label: "Pending", value: users.filter((u: any) => u.status === "pending").length, icon: <Shield className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50" },
            { label: "Sellers", value: users.filter((u: any) => u.role === "seller").length, icon: <ShoppingBag className="w-5 h-5 text-purple-600" />, bg: "bg-purple-50" },
            { label: "Transporters", value: users.filter((u: any) => u.role === "transporter").length, icon: <Truck className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 flex items-center gap-3 border border-white shadow-sm`}>
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">{stat.icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-gray-200"
            />
          </div>
          <Select value={role} onValueChange={(v) => { setRole(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-40 rounded-xl border-gray-200">
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
            <SelectTrigger className="w-40 rounded-xl border-gray-200">
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

        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-gray-100 bg-white">
            <CardTitle className="text-base font-semibold text-gray-700">Users ({data?.total ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 bg-white">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((u: any) => (
                  <div key={u.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm flex-shrink-0">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${roleColor(u.role)}`}>
                            {roleIcon(u.role)} {u.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                          <span>{u.email}</span>
                          {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{u.phone}</span>}
                          {u.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{u.city}</span>}
                        </div>
                        {u.sellerId && <p className="text-xs font-mono text-teal-600 mt-0.5">{u.sellerId}</p>}
                        {/* Document links for sellers and transporters */}
                        {(u.role === "seller" || u.role === "transporter") && (u.governmentIdUrl || u.rcBookUrl) && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {u.governmentIdUrl && (
                              <a
                                href={u.governmentIdUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 hover:bg-blue-100 transition-colors"
                              >
                                <FileText className="w-3 h-3" />
                                Gov ID
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                            {u.rcBookUrl && (
                              <a
                                href={u.rcBookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 hover:bg-purple-100 transition-colors"
                              >
                                <FileText className="w-3 h-3" />
                                RC Book
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                        {(u.role === "seller" || u.role === "transporter") && u.status === "pending" && !u.governmentIdUrl && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> No documents uploaded
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`text-xs ${getStatusColor(u.status)}`}>{u.status}</Badge>
                      {u.status === "pending" && (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="gap-1 bg-green-600 hover:bg-green-700 rounded-lg h-8 text-xs"
                            onClick={() => approve.mutate({ id: u.id })}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </Button>
                        </div>
                      )}
                      {u.status === "approved" && u.role !== "admin" && (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-red-600 border-red-200 hover:bg-red-50 rounded-lg h-8 text-xs"
                            onClick={() => {
                              if (window.confirm(`Block ${u.name}? They will lose access to PawZone until unblocked.`)) {
                                block.mutate({ id: u.id });
                              }
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Block
                          </Button>
                        </div>
                      )}
                      {u.status === "blocked" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg h-8 text-xs"
                          onClick={() => {
                            if (window.confirm(`Unblock ${u.name} and restore their access?`)) {
                              approve.mutate({ id: u.id });
                            }
                          }}
                        >
                          Unblock
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {data && data.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <span className="flex items-center px-4 text-sm text-gray-500">Page {page} of {data.totalPages}</span>
            <Button variant="outline" className="rounded-xl" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
