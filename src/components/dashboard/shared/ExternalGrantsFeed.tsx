import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Calendar, DollarSign, Sparkles, RefreshCw, Globe } from "lucide-react";
import { toast } from "sonner";

type ExternalGrant = {
  title: string;
  organization: string;
  deadline: string;
  description: string;
  url: string;
  relevance: string;
  funding_amount: string;
};

const ExternalGrantsFeed = ({ userRole }: { userRole: string }) => {
  const { profile } = useAuth();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["external_grants_feed", userRole],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-grants-feed", {
        body: {
          userRole,
          impactArea: profile?.waste_categories?.join(", ") || profile?.area_of_operation || "",
        },
      });
      if (error) throw error;
      return (data?.grants || []) as ExternalGrant[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    refetchOnWindowFocus: false,
  });

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Daily Top Opportunities</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            refetch();
            toast.info("Refreshing opportunities...");
          }}
          disabled={isFetching}
          className="gap-1"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
          <Globe className="w-3 h-3" />
          AI-curated from OpportunitiesForAfricans, OpportunityDesk, OpportunitiesForYouth & YouthOp
        </p>

        {isLoading || isFetching ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Finding opportunities for you...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">Could not load opportunities right now.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No matching opportunities found today. Check back tomorrow!
          </p>
        ) : (
          <div className="space-y-3">
            {data.map((grant, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-muted/30 border border-border space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {grant.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {grant.organization}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    #{idx + 1}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">{grant.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {grant.deadline}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {grant.funding_amount}
                  </span>
                </div>

                <div className="bg-primary/5 rounded p-2">
                  <p className="text-xs text-primary font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Why it's for you
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{grant.relevance}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {grant.url && grant.url !== "Unknown" && (
                    <>
                      <Button
                        size="sm"
                        className="w-full sm:w-auto gap-1"
                        asChild
                      >
                        <a href={grant.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" /> Apply Now
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto gap-1"
                        asChild
                      >
                        <a href={grant.url} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-3 h-3" /> Learn More
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExternalGrantsFeed;
