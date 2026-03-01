import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, FileText, CheckCircle2, Clock, XCircle } from "lucide-react";

interface Order {
  id: string;
  supplier: string;
  material: string;
  quantity: string;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  date: string;
  total: string;
}

const mockOrders: Order[] = [
  { id: "ORD-001", supplier: "Kibera Aggregators", material: "PET Bottles", quantity: "500 kg", status: "confirmed", date: "Feb 28, 2026", total: "KES 17,500" },
  { id: "ORD-002", supplier: "Dandora Collections", material: "HDPE Containers", quantity: "300 kg", status: "pending", date: "Mar 1, 2026", total: "KES 12,000" },
  { id: "ORD-003", supplier: "Mathare Green", material: "Aluminium Cans", quantity: "150 kg", status: "delivered", date: "Feb 25, 2026", total: "KES 22,500" },
];

const statusMap: Record<string, { icon: React.ElementType; variant: "default" | "secondary" | "destructive"; label: string }> = {
  pending: { icon: Clock, variant: "secondary", label: "Pending" },
  confirmed: { icon: CheckCircle2, variant: "default", label: "Confirmed" },
  delivered: { icon: CheckCircle2, variant: "default", label: "Delivered" },
  cancelled: { icon: XCircle, variant: "destructive", label: "Cancelled" },
};

const OrdersPanel = () => {
  const [orders] = useState<Order[]>(mockOrders);

  const active = orders.filter((o) => o.status !== "cancelled" && o.status !== "delivered");
  const completed = orders.filter((o) => o.status === "delivered");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <ClipboardList className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{orders.length}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="w-7 h-7 text-accent" />
            <div>
              <p className="text-xl font-bold text-foreground">{active.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{completed.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Orders & Contracts</CardTitle>
          <Button size="sm" variant="outline" disabled>
            <Plus className="w-4 h-4 mr-1" /> New Order
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {orders.map((o) => {
              const s = statusMap[o.status];
              const SIcon = s.icon;
              return (
                <div key={o.id} className="flex items-center justify-between py-3">
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{o.material} — {o.quantity}</p>
                      <p className="text-xs text-muted-foreground">{o.supplier} · {o.date}</p>
                      <p className="text-xs font-medium text-foreground mt-0.5">{o.total}</p>
                    </div>
                  </div>
                  <Badge variant={s.variant} className="flex items-center gap-1">
                    <SIcon className="w-3 h-3" /> {s.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPanel;
