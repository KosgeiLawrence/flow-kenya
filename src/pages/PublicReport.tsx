import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Download, FileText, ArrowLeft } from "lucide-react";
import reportIcon from "@/assets/report-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { generateCleanupReportPDF } from "@/lib/cleanupReportPdf";
import { toast } from "sonner";

const PublicReport = () => {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-public-report", {
        body: { reportId: id, name: name.trim(), email: email.trim() },
      });

      if (fnError) throw new Error(fnError.message || "Failed to fetch report");
      if (data?.error) throw new Error(data.error);

      await generateCleanupReportPDF(data.cleanup);
      toast.success("Report downloaded successfully!");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Branding */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={reportIcon} alt="Twende Green Ecocycle" className="w-10 h-10" />
            <span className="text-2xl font-bold font-display text-foreground">Twende Green Ecocycle</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Cleanup Exercise Report</h1>
          <p className="text-sm text-muted-foreground">
            Enter your details below to download this cleanup report for free.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Download Report
            </CardTitle>
            <CardDescription>
              Your details help us track the impact and reach of our cleanup exercises.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Full Name</Label>
              <Input
                id="report-name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-email">Email Address</Label>
              <Input
                id="report-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDownload()}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              onClick={handleDownload}
              disabled={loading}
              className="w-full gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {loading ? "Preparing Report…" : "Download PDF Report"}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Learn more about Twende Green Ecocycle
          </Link>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          © Twende Green Ecocycle · Circular Economy Traceability Platform
        </p>
      </div>
    </div>
  );
};

export default PublicReport;
