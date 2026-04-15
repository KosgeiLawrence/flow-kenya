import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Store, Search, ArrowLeft, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import MarketplaceListingCard from "@/components/dashboard/shared/MarketplaceListingCard";

const categoryFilters = [
  { value: "all", label: "All Categories" },
  { value: "raw_material", label: "Raw Materials" },
  { value: "recycled_product", label: "Recycled Products" },
  { value: "equipment", label: "Equipment" },
  { value: "service", label: "Services" },
];

const Marketplace = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [countyFilter, setCountyFilter] = useState("");

  const { data: listings, isLoading } = useQuery({
    queryKey: ["public_marketplace", categoryFilter, countyFilter],
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

  const filteredListings = listings?.filter(l =>
    !search || l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.material_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background bg-radial-glow">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-4">
            <Store className="w-4 h-4" /> Duara Flow Marketplace
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-3">
            Circular Economy <span className="text-primary">Marketplace</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Browse waste materials, recycled products, and equipment from verified waste pickers, aggregators, and recyclers across Kenya.
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 mb-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{listings?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Active Listings</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{new Set(listings?.map(l => l.seller_user_id) || []).size}</p>
            <p className="text-xs text-muted-foreground">Verified Sellers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{new Set(listings?.map(l => l.county).filter(Boolean) || []).size}</p>
            <p className="text-xs text-muted-foreground">Counties</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search materials, products, equipment..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categoryFilters.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Filter by county..." value={countyFilter} onChange={e => setCountyFilter(e.target.value)} className="w-full sm:w-40" />
        </div>

        {/* Listings */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-64 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : !filteredListings.length ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No listings available yet</p>
            <p className="text-sm text-muted-foreground mt-1">Sign up as a seller to post the first listing!</p>
            <Link to="/signup">
              <Button className="mt-4">Get Started</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredListings.map(listing => (
              <MarketplaceListingCard key={listing.id} listing={listing} isPublic />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
