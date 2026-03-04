import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Truck, Leaf } from "lucide-react";
import ClientCollectionFlow from "./ClientCollectionFlow";
import PickupRequestFlow from "./PickupRequestFlow";

type Flow = "select" | "client" | "pickup";

const SchedulePanel = () => {
  const [flow, setFlow] = useState<Flow>("select");

  if (flow === "client") return <ClientCollectionFlow onBack={() => setFlow("select")} />;
  if (flow === "pickup") return <PickupRequestFlow onBack={() => setFlow("select")} />;

  return (
    <div className="space-y-6">
      <Card className="shadow-soft bg-primary/5 border-primary/20">
        <CardContent className="flex items-center gap-3 p-4">
          <Leaf className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Schedule Collection</p>
            <p className="text-xs text-muted-foreground">
              Choose how you want to handle your waste collection — go to a client or request a pickup from an aggregator/recycler.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="shadow-soft cursor-pointer hover:border-primary/40 transition-colors group"
          onClick={() => setFlow("client")}
        >
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Collect From Client</h3>
            <p className="text-xs text-muted-foreground">
              Go to a client location to collect waste. Record the collection and generate quotations, invoices, or receipts.
            </p>
            <Button variant="outline" size="sm" className="mt-2">Field Collection →</Button>
          </CardContent>
        </Card>

        <Card
          className="shadow-soft cursor-pointer hover:border-primary/40 transition-colors group"
          onClick={() => setFlow("pickup")}
        >
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Request Pickup</h3>
            <p className="text-xs text-muted-foreground">
              Request an aggregator or recycler to pick up your inventory. Select from registered partners, track responses, and generate documents.
            </p>
            <Button variant="outline" size="sm" className="mt-2">Inventory Sale →</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SchedulePanel;
