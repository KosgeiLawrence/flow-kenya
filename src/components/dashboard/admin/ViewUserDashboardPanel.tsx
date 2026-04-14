import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Eye, Search, Users } from "lucide-react";
import { AuthContext, useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

// Lazy imports for dashboard content
import WastePickerDashboard from "@/pages/WastePickerDashboard";
import AggregatorDashboard from "@/pages/AggregatorDashboard";
import RecyclerDashboard from "@/pages/RecyclerDashboard";
import NGODashboard from "@/pages/NGODashboard";
import CorporateDashboard from "@/pages/CorporateDashboard";
import CountyGovernmentDashboard from "@/pages/CountyGovernmentDashboard";
import { useTranslation } from "react-i18next";

type AppRole = "waste_picker" | "aggregator" | "recycler" | "ngo" | "corporate" | "county_government" | "admin";

const roleDashboardMap: Record<string, React.ComponentType> = {
  waste_picker: WastePickerDashboard,
  aggregator: AggregatorDashboard,
  recycler: RecyclerDashboard,
  ngo: NGODashboard,
  corporate: CorporateDashboard,
  county_government: CountyGovernmentDashboard,
};

const roleLabels: Record<string, string> = {
  waste_picker: "Waste Picker",
  aggregator: "Aggregator",
  recycler: "Recycler",
  ngo: "NGO",
  corporate: "Corporate",
  county_government: "County Government",
  admin: "Admin",
};

const ViewUserDashboardPanel = () => {
  const realAuth = useAuth();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getRoleForUser = (userId: string): string => {
    return roles?.find((r) => r.user_id === userId)?.role || "unknown";
  };

  const selectedProfile = profiles?.find((p) => p.user_id === selectedUserId);
  const selectedRole = selectedUserId ? getRoleForUser(selectedUserId) : null;

  const filtered = profiles?.filter((p) => {
    const role = getRoleForUser(p.user_id);
    const matchesRole = roleFilter === "all" || role === roleFilter;
    const matchesSearch = !searchTerm || 
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase());
    // Exclude admin users (no point viewing admin dashboard)
    const notAdmin = role !== "admin";
    return matchesRole && matchesSearch && notAdmin;
  }) || [];

  // When viewing a user's dashboard, wrap it in an overridden AuthContext
  if (selectedUserId && selectedProfile && selectedRole && roleDashboardMap[selectedRole]) {
    const DashboardComponent = roleDashboardMap[selectedRole];
    
    const impersonatedAuth = {
      ...realAuth,
      user: { ...realAuth.user!, id: selectedUserId } as any,
      role: selectedRole as AppRole,
      profile: {
        id: selectedProfile.id,
        user_id: selectedProfile.user_id,
        full_name: selectedProfile.full_name,
        phone_number: selectedProfile.phone_number,
        email: selectedProfile.email,
        approval_status: selectedProfile.approval_status as "pending" | "approved" | "rejected",
        organization_id: selectedProfile.organization_id,
        is_independent: selectedProfile.is_independent ?? false,
        national_id: selectedProfile.national_id,
        company_registration: selectedProfile.company_registration,
        avatar_url: selectedProfile.avatar_url,
        kra_pin: selectedProfile.kra_pin,
        physical_address: selectedProfile.physical_address,
        county: selectedProfile.county,
        sub_county: selectedProfile.sub_county,
        website: selectedProfile.website,
        social_media_links: selectedProfile.social_media_links as Record<string, string> | null,
        area_of_operation: selectedProfile.area_of_operation,
        waste_categories: selectedProfile.waste_categories,
        daily_capacity_kg: selectedProfile.daily_capacity_kg,
        monthly_capacity_kg: selectedProfile.monthly_capacity_kg,
        payment_method: selectedProfile.payment_method,
        mpesa_number: selectedProfile.mpesa_number,
        bank_name: selectedProfile.bank_name,
        bank_account_number: selectedProfile.bank_account_number,
        industry_sector: selectedProfile.industry_sector,
        date_of_birth: selectedProfile.date_of_birth,
        gender: selectedProfile.gender,
      },
      subscribed: true,
      checkingSubscription: false,
      signOut: async () => {
        // Don't actually sign out - just go back to user list
        setSelectedUserId(null);
      },
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelectedUserId(null)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </Button>
          <Badge variant="secondary" className="text-sm">
            Viewing as: {selectedProfile.full_name} ({roleLabels[selectedRole] || selectedRole})
          </Badge>
        </div>
        <div className="border border-border rounded-lg overflow-hidden -mx-4 md:-mx-6 -mb-4 md:-mb-6">
          <AuthContext.Provider value={impersonatedAuth}>
            <DashboardComponent />
          </AuthContext.Provider>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">View User Dashboards</h2>
        <p className="text-muted-foreground">Click on any user to view their dashboard as they see it</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="waste_picker">Waste Picker</SelectItem>
            <SelectItem value="aggregator">Aggregator</SelectItem>
            <SelectItem value="recycler">Recycler</SelectItem>
            <SelectItem value="ngo">NGO</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
            <SelectItem value="county_government">County Government</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Platform Users ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading users...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const userRole = getRoleForUser(p.user_id);
                  return (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUserId(p.user_id)}>
                      <TableCell className="font-medium">{p.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabels[userRole] || userRole}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          p.approval_status === "approved" ? "bg-primary/20 text-primary" :
                          p.approval_status === "rejected" ? "bg-destructive/20 text-destructive" :
                          "bg-secondary/20 text-secondary"
                        }>
                          {p.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="gap-1.5 text-primary h-8">
                          <Eye className="w-3.5 h-3.5" /> View Dashboard
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewUserDashboardPanel;
