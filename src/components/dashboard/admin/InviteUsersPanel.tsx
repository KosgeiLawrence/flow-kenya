import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, Loader2, CheckCircle } from "lucide-react";

const InviteUsersPanel = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentEmails, setSentEmails] = useState<{ email: string; sentAt: string }[]>([]);

  const handleSend = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter an email address.", variant: "destructive" });
      return;
    }

    if (includeCoupon && !couponCode.trim()) {
      toast({ title: "Coupon code required", description: "Please enter a coupon code or disable the coupon option.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: {
          email: email.trim(),
          couponCode: includeCoupon ? couponCode.trim() : null,
        },
      });

      if (error) throw error;

      setSentEmails(prev => [{
        email: email.trim(),
        coupon: includeCoupon ? couponCode.trim() : undefined,
        sentAt: new Date().toLocaleString(),
      }, ...prev]);

      toast({ title: "Invitation sent! ✉️", description: `Invite sent to ${email.trim()}` });
      setEmail("");
      setCouponCode("");
      setIncludeCoupon(false);
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Mail className="w-5 h-5 text-primary" />
            Invite Users
          </CardTitle>
          <CardDescription>
            Send email invitations to join Duara Flow. Optionally include a coupon code for discounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-secondary" />
              <div>
                <p className="text-sm font-medium text-foreground">Include Coupon Code</p>
                <p className="text-xs text-muted-foreground">Award a discount coupon with the invitation</p>
              </div>
            </div>
            <Switch checked={includeCoupon} onCheckedChange={setIncludeCoupon} />
          </div>

          {includeCoupon && (
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Coupon Code</Label>
              <Input
                id="coupon-code"
                placeholder="e.g. WELCOME2024"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              />
            </div>
          )}

          <Button onClick={handleSend} disabled={sending} className="w-full gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending…" : "Send Invitation"}
          </Button>
        </CardContent>
      </Card>

      {sentEmails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Recently Sent Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sentEmails.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.email}</p>
                      <p className="text-xs text-muted-foreground">{item.sentAt}</p>
                    </div>
                  </div>
                  {item.coupon && (
                    <span className="text-xs font-mono bg-secondary/20 text-secondary-foreground px-2 py-1 rounded">
                      {item.coupon}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InviteUsersPanel;
