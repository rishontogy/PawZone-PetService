import { useParams, useLocation } from "wouter";
import { useGetOrder, useProcessPayment, useReportIssue } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getStatusColor, platformFee } from "@/lib/api";
import { ChevronLeft, Shield, AlertCircle, Package } from "lucide-react";
import { useState } from "react";

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [issueDesc, setIssueDesc] = useState("");
  const [showIssue, setShowIssue] = useState(false);

  const { data: order, refetch } = useGetOrder(parseInt(id!), { query: { enabled: !!user } });

  const processPayment = useProcessPayment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Payment confirmed!" });
        refetch();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Payment failed", description: err?.data?.error });
      },
    },
  });

  const reportIssue = useReportIssue({
    mutation: {
      onSuccess: () => {
        toast({ title: "Issue reported", description: "Our admin team will review your dispute." });
        setShowIssue(false);
        refetch();
      },
    },
  });

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );

  // Payment deadline: 3 hours from order creation
  const payDeadline = new Date(order.createdAt);
  payDeadline.setHours(payDeadline.getHours() + 3);
  const payExpired = new Date() > payDeadline;
  const timeLeft = Math.max(0, payDeadline.getTime() - Date.now());
  const hoursLeft = Math.floor(timeLeft / 3600000);
  const minsLeft = Math.floor((timeLeft % 3600000) / 60000);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setLocation("/buyer/orders")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to orders
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">
              Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <Badge className={getStatusColor(order.status)}>{order.status.replace(/_/g, " ")}</Badge>
        </div>

        {/* Payment Section */}
        {order.status === "pending_payment" && !payExpired && (
          <Card className="border-amber-200 bg-amber-50 mb-4">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">Payment Required</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Please complete payment within {hoursLeft}h {minsLeft}m to confirm your order.
                  </p>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => processPayment.mutate({ id: order.id, data: { method: "upi" } })}
                    disabled={processPayment.isPending}
                  >
                    {processPayment.isPending ? "Processing..." : `Pay ${formatPrice(order.totalAmount)}`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {order.status === "pending_payment" && payExpired && (
          <Card className="border-red-200 bg-red-50 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">Payment window expired. Order will be cancelled.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" /> Order Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {order.items?.map((item: any) => (
                <div key={item.id} className="p-4 flex items-center gap-4">
                  <div className="w-14 h-14 bg-muted rounded-lg overflow-hidden">
                    {item.photo && <img src={item.photo} alt={item.breed} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.breed}</p>
                    <p className="text-sm text-muted-foreground">{formatPrice(item.price)} x {item.quantity}</p>
                    {item.petCode && (
                      <div className="flex items-center gap-1 mt-1">
                        <Shield className="w-3 h-3 text-primary" />
                        <code className="text-xs text-primary">{item.petCode}</code>
                      </div>
                    )}
                  </div>
                  <p className="font-semibold">{formatPrice((item.price + platformFee(item.price)) * item.quantity)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="mb-4">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal || order.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform fees</span>
              <span>{formatPrice(order.platformFee || 0)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(order.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery */}
        {order.deliveryAddress && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <p className="font-medium text-sm mb-1">Delivery Address</p>
              <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {order.timeline && order.timeline.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3"><CardTitle className="text-base">Order Timeline</CardTitle></CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {order.timeline.map((event: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{event.status.replace(/_/g, " ")}</p>
                      {event.note && <p className="text-xs text-muted-foreground">{event.note}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Issue */}
        {["paid", "in_transit", "delivered"].includes(order.status) && (
          <div>
            {!showIssue ? (
              <Button variant="outline" size="sm" onClick={() => setShowIssue(true)}>
                Report an Issue
              </Button>
            ) : (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="font-medium text-sm">Report Issue</p>
                  <textarea
                    className="w-full text-sm border rounded-md p-2 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Describe the issue with your order..."
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => reportIssue.mutate({ id: order.id, data: { description: issueDesc } })}
                      disabled={!issueDesc.trim() || reportIssue.isPending}
                    >
                      Submit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowIssue(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
