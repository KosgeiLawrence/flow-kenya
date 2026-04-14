import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailX, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Status = "loading" | "valid" | "already_unsubscribed" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`, {
          headers: { apikey: SUPABASE_ANON_KEY },
        });
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") { setStatus("already_unsubscribed"); return; }
        setStatus("valid");
      } catch { setStatus("error"); }
    })();
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) throw error;
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already_unsubscribed");
      else setStatus("error");
    } catch { setStatus("error"); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <MailX className="w-5 h-5" /> Email Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />}
          {status === "valid" && (
            <>
              <p className="text-muted-foreground">Click below to unsubscribe from Duara Flow emails.</p>
              <Button onClick={handleUnsubscribe} disabled={processing} variant="destructive">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</> : "Confirm Unsubscribe"}
              </Button>
            </>
          )}
          {status === "success" && (
            <div className="space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-medium">You have been unsubscribed.</p>
              <p className="text-sm text-muted-foreground">You will no longer receive emails from Duara Flow.</p>
            </div>
          )}
          {status === "already_unsubscribed" && (
            <div className="space-y-2">
              <CheckCircle className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-medium">Already unsubscribed</p>
              <p className="text-sm text-muted-foreground">This email has already been unsubscribed.</p>
            </div>
          )}
          {status === "invalid" && (
            <div className="space-y-2">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
              <p className="font-medium">Invalid or expired link</p>
              <p className="text-sm text-muted-foreground">This unsubscribe link is no longer valid.</p>
            </div>
          )}
          {status === "error" && (
            <div className="space-y-2">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
              <p className="font-medium">Something went wrong</p>
              <p className="text-sm text-muted-foreground">Please try again later.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
