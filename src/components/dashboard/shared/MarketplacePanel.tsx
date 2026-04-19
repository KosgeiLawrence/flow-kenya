import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Search, Package, ShoppingBag, Trash2, Pause, Play, Eye, Pencil, ShieldCheck, LayoutGrid } from "lucide-react";
import MarketplaceListingCard from "./MarketplaceListingCard";
import CreateListingDialog from "./CreateListingDialog";
import EditListingDialog from "./EditListingDialog";
import CatalogueManagerPanel from "./CatalogueManagerPanel";
import { toast } from "@/hooks/use-toast";

const categoryFilters = [
  { value: "all", label: "All Categories" },
  { value: "raw_material", label: "Raw Materials" },
  { value: "recycled_product", label: "Recycled Products" },
  { value: "equipment", label: "Equipment" },
  { value: "service", label: "Services" },
];

interface Props {
  /** Role of the viewer — determines if they can create listings */
  role?: string;
}

export default function MarketplacePanelShared({ role }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [countyFilter, setCountyFilter] = useState("");
  const [editListing, setEditListing] = useState<any>(null);
  const canPost = ["waste_picker", "aggregator", "recycler"].includes(role || "");
  const isAdmin = role === "admin";

  // Fetch all active listings (for browse)
  const { data: listings, isLoading } = useQuery({
    queryKey: ["marketplace_listings", categoryFilter, countyFilter],
    queryFn: async () => {
      let query = supabase
        .from("marketplace_listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
      if (countyFilter) query = query.ilike("county", `%${countyFilter}%`);

      const { data, error } = await query;
      if (error) throw error;

      if (data?.length) {
        const sellerIds = [...new Set(data.map(l => l.seller_user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, organizations(name)")
          .in("user_id", sellerIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data.map(l => ({ ...l, seller_profile: profileMap.get(l.seller_user_id) }));
      }
      return data || [];
    },
  });

  // Fetch user's own listings (sellers)
  const { data: myListings } = useQuery({
    queryKey: ["marketplace_listings_mine", user?.id],
    enabled: !!user && canPost,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("seller_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Admin: fetch ALL listings regardless of status
  const { data: allListings } = useQuery({
    queryKey: ["admin_all_marketplace_listings", categoryFilter],
    enabled: isAdmin,
    queryFn: async () => {
      let query = supabase
        .from("marketplace_listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);

      const { data, error } = await query;
      if (error) throw error;

      if (data?.length) {
        const sellerIds = [...new Set(data.map(l => l.seller_user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, organizations(name)")
          .in("user_id", sellerIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data.map(l => ({ ...l, seller_profile: profileMap.get(l.seller_user_id) }));
      }
      return data || [];
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase.from("marketplace_listings").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace_listings"] });
      queryClient.invalidateQueries({ queryKey: ["admin_all_marketplace_listings"] });
      toast({ title: "Listing updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace_listings"] });
      queryClient.invalidateQueries({ queryKey: ["admin_all_marketplace_listings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace_listings_mine"] });
      toast({ title: "Listing deleted" });
    },
  });

  const filteredListings = listings?.filter(l =>
    !search || l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.material_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const filteredAllListings = allListings?.filter(l =>
    !search || l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.material_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const statusLabel: Record<string, string> = { active: "Active", paused: "Paused", sold: "Sold" };
  const statusColors: Record<string, string> = { active: "default", paused: "secondary", sold: "outline" };
  const roleLabels: Record<string, string> = { waste_picker: "Waste Picker", aggregator: "Aggregator", recycler: "Recycler" };

  const renderListingRow = (l: any, showSeller = false) => (
    <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-3 min-w-0">
        {l.images?.length > 0 ? (
          <img src={l.images[0]} className="w-12 h-12 rounded-lg object-cover shrink-0" alt="" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{l.title}</p>
          <p className="text-xs text-muted-foreground">KES {l.price_per_unit}/{l.unit} · {l.quantity} {l.unit}</p>
          {showSeller && (
            <p className="text-xs text-muted-foreground">
              {l.seller_profile?.full_name || "Unknown"} · <span className="text-primary">{roleLabels[l.seller_role] || l.seller_role}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={statusColors[l.status] as any || "secondary"}>
          {statusLabel[l.status] || l.status}
        </Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Eye className="w-3 h-3" />{l.views_count}</span>
        <Button
          variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => setEditListing(l)}
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => toggleStatusMutation.mutate({ id: l.id, newStatus: l.status === "active" ? "paused" : "active" })}
          title={l.status === "active" ? "Pause" : "Activate"}
        >
          {l.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(l.id)} title="Delete">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" /> Marketplace
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Manage all marketplace listings" : "Browse and trade waste materials, recycled products & equipment"}
          </p>
        </div>
        {canPost && role && <CreateListingDialog sellerRole={role} />}
      </div>

      {isAdmin ? (
        <Tabs defaultValue="manage" className="space-y-4">
          <TabsList>
            <TabsTrigger value="manage" className="gap-1.5"><ShieldCheck className="w-4 h-4" /> All Listings ({allListings?.length || 0})</TabsTrigger>
            <TabsTrigger value="browse" className="gap-1.5"><ShoppingBag className="w-4 h-4" /> Browse Active</TabsTrigger>
          </TabsList>

          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">All Marketplace Listings</CardTitle>
                  <Badge variant="outline">{filteredAllListings.length} total</Badge>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search listings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categoryFilters.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {!filteredAllListings.length ? (
                  <div className="text-center py-8">
                    <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No listings found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAllListings.map(l => renderListingRow(l, true))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="browse">
            <BrowseView
              listings={filteredListings}
              isLoading={isLoading}
              search={search}
              setSearch={setSearch}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              countyFilter={countyFilter}
              setCountyFilter={setCountyFilter}
            />
          </TabsContent>
        </Tabs>
      ) : canPost ? (
        <Tabs defaultValue="browse" className="space-y-4">
          <TabsList>
            <TabsTrigger value="browse" className="gap-1.5"><ShoppingBag className="w-4 h-4" /> Browse</TabsTrigger>
            <TabsTrigger value="my-listings" className="gap-1.5"><Package className="w-4 h-4" /> My Listings ({myListings?.length || 0})</TabsTrigger>
            <TabsTrigger value="my-catalogue" className="gap-1.5"><LayoutGrid className="w-4 h-4" /> My Catalogue</TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            <BrowseView
              listings={filteredListings}
              isLoading={isLoading}
              search={search}
              setSearch={setSearch}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              countyFilter={countyFilter}
              setCountyFilter={setCountyFilter}
            />
          </TabsContent>

          <TabsContent value="my-listings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Listings</CardTitle>
              </CardHeader>
              <CardContent>
                {!myListings?.length ? (
                  <div className="text-center py-8">
                    <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">You haven't posted any listings yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myListings.map(l => renderListingRow(l))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-catalogue">
            <CatalogueManagerPanel />
          </TabsContent>
        </Tabs>
      ) : (
        <BrowseView
          listings={filteredListings}
          isLoading={isLoading}
          search={search}
          setSearch={setSearch}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          countyFilter={countyFilter}
          setCountyFilter={setCountyFilter}
        />
      )}

      {/* Edit dialog */}
      {editListing && (
        <EditListingDialog
          listing={editListing}
          open={!!editListing}
          onOpenChange={(open) => { if (!open) setEditListing(null); }}
        />
      )}
    </div>
  );
}

function BrowseView({ listings, isLoading, search, setSearch, categoryFilter, setCategoryFilter, countyFilter, setCountyFilter }: {
  listings: any[];
  isLoading: boolean;
  search: string;
  setSearch: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (s: string) => void;
  countyFilter: string;
  setCountyFilter: (s: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search listings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {categoryFilters.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Filter by county..." value={countyFilter} onChange={e => setCountyFilter(e.target.value)} className="w-full sm:w-36" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : !listings.length ? (
        <div className="text-center py-16">
          <Store className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No listings found</p>
          <p className="text-sm text-muted-foreground mt-1">Check back later or adjust your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(listing => (
            <MarketplaceListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
