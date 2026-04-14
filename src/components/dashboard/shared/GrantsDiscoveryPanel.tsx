import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Briefcase, Target, Calendar, Send, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import ExternalGrantsFeed from "./ExternalGrantsFeed";
import { useTranslation } from "react-i18next";

const GrantsDiscoveryPanel = ({ userRole = "waste_picker" }: { userRole?: string }) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Fetch active NGO programs
  const { data: programs, isLoading } = useQuery({
    queryKey: ["available_programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ngo_programs")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's own applications
  const { data: myApplications } = useQuery({
    queryKey: ["my_program_applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const userRoleQuery = useQuery({
    queryKey: ["my_role"],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data?.role;
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (programId: string) => {
      if (!user || !profile) throw new Error("You must be logged in");
      const { error } = await supabase.from("program_applications").insert({
        program_id: programId,
        user_id: user.id,
        applicant_name: profile.full_name || "Unknown",
        applicant_role: userRoleQuery.data || "unknown",
        message: message.trim() || null,
      });
      if (error) {
        if (error.code === "23505") throw new Error("You have already applied to this program");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_program_applications"] });
      toast.success("Application submitted successfully!");
      setApplyingTo(null);
      setMessage("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getApplicationStatus = (programId: string) => {
    return myApplications?.find((a) => a.program_id === programId);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" /> Pending
          </Badge>
        );
    }
  };

  const activePrograms = programs?.length || 0;

  return (
    <div className="space-y-6">
      {/* AI-curated external grants feed */}
      <ExternalGrantsFeed userRole={userRole} />
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Briefcase className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{activePrograms}</p>
              <p className="text-xs text-muted-foreground">Available Programs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <Send className="w-7 h-7 text-secondary" />
            <div>
              <p className="text-xl font-bold text-foreground">{myApplications?.length || 0}</p>
              <p className="text-xs text-muted-foreground">My Applications</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">
                {myApplications?.filter((a) => a.status === "approved").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Programs list */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Available Grants & Programs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !programs?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No active programs available at the moment. Check back later!
            </p>
          ) : (
            programs.map((p) => {
              const application = getApplicationStatus(p.id);
              const recoveryProgress =
                p.target_kg > 0 ? (Number(p.recovered_kg) / Number(p.target_kg)) * 100 : 0;

              return (
                <div
                  key={p.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.funder ? `Funded by ${p.funder}` : "Self-funded"} ·{" "}
                        {p.county || "National"}
                      </p>
                    </div>
                    {application ? (
                      statusBadge(application.status)
                    ) : (
                      <Badge variant="outline">Open</Badge>
                    )}
                  </div>

                  {p.description && (
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(p.start_date), "MMM d, yyyy")} —{" "}
                    {format(new Date(p.end_date), "MMM d, yyyy")}
                  </div>

                  {Number(p.target_kg) > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Recovery Target: {Number(p.target_kg).toLocaleString()} kg
                        </span>
                        <span className="font-medium text-foreground">
                          {recoveryProgress.toFixed(0)}% achieved
                        </span>
                      </div>
                      <Progress value={Math.min(recoveryProgress, 100)} className="h-2" />
                    </div>
                  )}

                  {/* Apply button or status */}
                  {!application ? (
                    <Dialog
                      open={applyingTo === p.id}
                      onOpenChange={(open) => {
                        setApplyingTo(open ? p.id : null);
                        if (!open) setMessage("");
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full sm:w-auto">
                          <Send className="w-4 h-4 mr-1" /> Apply Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Apply to: {p.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Your name: <span className="font-medium text-foreground">{profile?.full_name}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Role: <span className="font-medium text-foreground capitalize">{userRoleQuery.data?.replace("_", " ")}</span>
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground">
                              Message (optional)
                            </label>
                            <Textarea
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Tell the NGO why you'd like to participate in this program..."
                              maxLength={1000}
                              className="mt-1"
                            />
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => applyMutation.mutate(p.id)}
                            disabled={applyMutation.isPending}
                          >
                            {applyMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Submitting...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-1" /> Submit Application
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Applied on {format(new Date(application.created_at), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* My Applications */}
      {myApplications && myApplications.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">My Applications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myApplications.map((app) => {
              const program = programs?.find((p) => p.id === app.program_id);
              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {program?.name || "Unknown Program"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Applied: {format(new Date(app.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  {statusBadge(app.status)}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GrantsDiscoveryPanel;
