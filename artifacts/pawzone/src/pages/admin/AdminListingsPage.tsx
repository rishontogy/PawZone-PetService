import { useState } from "react";
import { useAdminGetListings, useAdminApproveListing, useAdminRejectListing } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/api";
import { Package, CheckCircle, XCircle, PawPrint, ChevronDown, ChevronUp, MapPin, Syringe, ZoomIn, Play } from "lucide-react";
import { MediaViewer } from "@/components/MediaViewer";
import type { MediaItem } from "@/components/MediaViewer";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export function AdminListingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [viewerItems, setViewerItems] = useState<MediaItem[]>([]);
  const [viewerIdx, setViewerIdx] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  const { data, refetch } = useAdminGetListings(
    { page, limit: 20, status: status || undefined },
    { query: { enabled: !!user } }
  );

  const approve = useAdminApproveListing({
    mutation: {
      onSuccess: () => { toast({ title: "✅ Listing approved" }); refetch(); },
      onError: (err: any) => { toast({ variant: "destructive", title: "Error", description: err?.data?.error }); },
    },
  });

  const reject = useAdminRejectListing({
    mutation: {
      onSuccess: () => { toast({ title: "Listing rejected" }); refetch(); },
    },
  });

  const listings = data?.listings ?? [];
  const pendingCount = listings.filter((l: any) => l.status === "pending").length;

  const openViewer = (items: MediaItem[], idx: number) => {
    setViewerItems(items);
    setViewerIdx(idx);
    setViewerOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <BackButton className="mb-4" />
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Package className="w-6 h-6" /> Listing Management
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {pendingCount > 0 ? `${pendingCount} listing${pendingCount > 1 ? "s" : ""} pending review` : "Review and approve pet listings"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-3 mb-6">
          <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-44 rounded-xl border-gray-200">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <span className="flex items-center text-sm text-gray-500">{listings.length} listing{listings.length !== 1 ? "s" : ""}</span>
        </div>

        {!listings.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No listings found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing: any) => {
              const isOpen = expandedId === listing.id;
              const photos: string[] = Array.isArray(listing.photos) ? listing.photos : [];
              const allMedia: MediaItem[] = [
                ...photos.map((url, i) => ({ kind: "image" as const, url, label: `Photo ${i + 1}` })),
                ...(listing.videoUrl ? [{ kind: "video" as const, url: listing.videoUrl, label: "Video" }] : []),
              ];
              const parentMedia: MediaItem[] = [
                ...(listing.fatherPhoto ? [{ kind: "image" as const, url: listing.fatherPhoto, label: "♂ Father" }] : []),
                ...(listing.motherPhoto ? [{ kind: "image" as const, url: listing.motherPhoto, label: "♀ Mother" }] : []),
              ];

              return (
                <div key={listing.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${listing.status === "pending" ? "border-amber-200" : "border-gray-100"}`}>
                  {/* Card Header */}
                  <button
                    className="w-full p-4 flex gap-4 items-center hover:bg-gray-50 transition-colors text-left"
                    onClick={() => setExpandedId(isOpen ? null : listing.id)}
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                      {photos[0] ? (
                        <img
                          src={photos[0]}
                          alt={listing.breed}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PawPrint className="w-7 h-7 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{listing.breed}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[listing.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {listing.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        <span className="capitalize">{listing.category}</span>
                        {listing.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.city}</span>}
                        <span className="font-bold text-teal-700">{formatPrice(listing.price)}</span>
                        <span>Seller: {listing.sellerName}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-4 space-y-4">
                      {/* Clickable photo strip */}
                      {allMedia.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 font-semibold">
                            Photos & Video
                            <span className="normal-case font-normal ml-1 text-gray-300">— tap to view</span>
                          </p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {allMedia.map((item, i) => (
                              <button
                                key={i}
                                onClick={() => openViewer(allMedia, i)}
                                className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 group hover:border-teal-300 transition-colors cursor-zoom-in"
                              >
                                {item.kind === "image" ? (
                                  <img
                                    src={item.url}
                                    alt={`Photo ${i + 1}`}
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                ) : (
                                  <>
                                    <video src={item.url} className="w-full h-full object-cover bg-black" muted preload="metadata" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                      <Play className="w-5 h-5 text-white fill-white" />
                                    </div>
                                  </>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                  <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Details grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Category</p>
                          <p className="font-medium text-gray-900 capitalize">{listing.category ?? "—"}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Age</p>
                          <p className="font-medium text-gray-900">{(listing as any).age != null ? `${(listing as any).age} month${(listing as any).age === 1 ? "" : "s"}` : "—"}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Price</p>
                          <p className="font-bold text-teal-700">{formatPrice(listing.price)}</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Inventory</p>
                          <div className="flex flex-wrap gap-2 text-xs font-medium">
                            <span className="text-blue-700">♂ {(listing as any).maleQuantity ?? 0} male</span>
                            <span className="text-pink-600">♀ {(listing as any).femaleQuantity ?? 0} female</span>
                            {((listing as any).pairCount ?? 0) > 0 && (
                              <span className="text-purple-600">♥ {(listing as any).pairCount} pair{(listing as any).pairCount > 1 ? "s" : ""}</span>
                            )}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Location</p>
                          <p className="font-medium text-gray-900">{listing.city ?? "—"}</p>
                        </div>
                        <div className={`rounded-xl p-3 flex items-center gap-2 ${listing.vaccinated ? "bg-green-50" : "bg-gray-50"}`}>
                          <Syringe className={`w-4 h-4 ${listing.vaccinated ? "text-green-600" : "text-gray-400"}`} />
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Vaccinated</p>
                            <p className={`font-medium text-sm ${listing.vaccinated ? "text-green-700" : "text-gray-500"}`}>
                              {listing.vaccinated ? "Yes" : "No"}
                            </p>
                          </div>
                        </div>
                        {(["dogs", "cats"] as string[]).includes(listing.category ?? "") && (
                          <div className={`rounded-xl p-3 flex items-center gap-2 ${(listing as any).kciCertified ? "bg-yellow-50" : "bg-gray-50"}`}>
                            <span className="text-base leading-none">🏅</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-400 uppercase tracking-wide">KCI Certified</p>
                              <p className={`font-medium text-sm ${(listing as any).kciCertified ? "text-yellow-700" : "text-gray-500"}`}>
                                {(listing as any).kciCertified ? "Yes" : "No"}
                              </p>
                              {(listing as any).kciCertified && (listing as any).kciCertificateUrl && (
                                <a
                                  href={(listing as any).kciCertificateUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline font-medium"
                                >
                                  View Certificate ↗
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {listing.description && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
                          <p className="text-sm text-gray-700">{listing.description}</p>
                        </div>
                      )}

                      {/* Parent Photos — clickable */}
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-semibold">
                          Parent Verification Photos
                          <span className="normal-case font-normal ml-1 text-gray-400">— tap to enlarge</span>
                        </p>
                        <div className="flex gap-3">
                          <div className="space-y-1">
                            {listing.fatherPhoto ? (
                              <button
                                onClick={() => openViewer(parentMedia, 0)}
                                className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100 border-2 border-blue-200 group relative cursor-zoom-in"
                              >
                                <img
                                  src={listing.fatherPhoto}
                                  alt="Father"
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                  <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-28 h-28 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <span className="text-xs text-gray-400 text-center px-1">Not Uploaded</span>
                              </div>
                            )}
                            <p className="text-xs text-center text-blue-700 font-medium">🟦 Father</p>
                          </div>
                          <div className="space-y-1">
                            {listing.motherPhoto ? (
                              <button
                                onClick={() => openViewer(parentMedia, listing.fatherPhoto ? 1 : 0)}
                                className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100 border-2 border-pink-200 group relative cursor-zoom-in"
                              >
                                <img
                                  src={listing.motherPhoto}
                                  alt="Mother"
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                  <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-28 h-28 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <span className="text-xs text-gray-400 text-center px-1">Not Uploaded</span>
                              </div>
                            )}
                            <p className="text-xs text-center text-pink-600 font-medium">🟪 Mother</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {listing.status === "pending" && (
                        <div className="flex gap-2 pt-1 flex-wrap">
                          <Button
                            size="sm"
                            className="gap-1 bg-green-600 hover:bg-green-700 text-white rounded-xl"
                            onClick={() => {
                              if (window.confirm(`Approve "${listing.breed}" listing? It will become visible to buyers.`)) {
                                approve.mutate({ id: listing.id });
                              }
                            }}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <div className="flex gap-1 flex-1 min-w-0">
                            <input
                              type="text"
                              placeholder="Rejection reason (optional)..."
                              className="flex-1 min-w-0 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-red-300"
                              value={rejectReason[listing.id] ?? ""}
                              onChange={(e) => setRejectReason(prev => ({ ...prev, [listing.id]: e.target.value }))}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-red-600 border-red-200 hover:bg-red-50 rounded-xl flex-shrink-0"
                              onClick={() => {
                                const reason = rejectReason[listing.id] || "Does not meet standards";
                                if (window.confirm(`Reject "${listing.breed}" listing?\nReason: ${reason}`)) {
                                  reject.mutate({ id: listing.id, data: { reason } });
                                }
                              }}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <span className="flex items-center px-4 text-sm text-gray-500">Page {page} of {data.totalPages}</span>
            <Button variant="outline" className="rounded-xl" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages}>Next</Button>
          </div>
        )}
      </div>

      {/* Global lightbox */}
      {viewerOpen && viewerItems.length > 0 && (
        <MediaViewer items={viewerItems} initialIndex={viewerIdx} onClose={() => setViewerOpen(false)} />
      )}
    </div>
  );
}
