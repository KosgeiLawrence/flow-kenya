import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Store, MapPin, TrendingUp, Package, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { optimizedImageUrl, imagePresets } from "@/lib/imageUtils";

const roleBadgeColors: Record<string, string> = {
  waste_picker: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  aggregator: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  recycler: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function TrendingMarketplace() {
  const { t } = useTranslation();

  const roleLabels: Record<string, string> = {
    waste_picker: t("marketplacePage.wastePicker"),
    aggregator: t("marketplacePage.aggregator"),
    recycler: t("marketplacePage.recycler"),
  };

  const categoryLabels: Record<string, string> = {
    raw_material: t("marketplacePage.rawMaterial"),
    recycled_product: t("marketplacePage.recycledProduct"),
    equipment: t("marketplacePage.equipment"),
    service: t("marketplacePage.service"),
  };

  const { data: listings, isLoading } = useQuery({
    queryKey: ["trending_marketplace"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("status", "active")
        .order("views_count", { ascending: false })
        .limit(8);
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
    staleTime: 60_000,
  });

  if (!isLoading && (!listings || listings.length === 0)) return null;

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="container relative z-10">
        <div className="mb-12 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold backdrop-blur-sm"
          >
            <TrendingUp className="w-4 h-4" /> {t("trending.badge")}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-4 font-display text-3xl font-bold text-foreground md:text-5xl"
          >
            {t("trending.title1")} <span className="text-gradient-gold">{t("trending.title2")}</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto max-w-2xl text-muted-foreground"
          >
            {t("trending.subtitle")}
          </motion.p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-72 rounded-2xl bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(listings as any[])?.slice(0, 8).map((listing: any, i: number) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.06, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                <Link to="/marketplace" className="block group">
                  <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(43,94,63,0.1)]">
                    <div className="relative h-40 bg-muted/20 overflow-hidden">
                      {listing.images?.length > 0 ? (
                        <img
                          src={optimizedImageUrl(listing.images[0], imagePresets.card)}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge className={`text-[10px] border ${roleBadgeColors[listing.seller_role] || "bg-muted"}`}>
                          {roleLabels[listing.seller_role] || listing.seller_role}
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-[10px] bg-black/40 backdrop-blur-sm border-0 text-white">
                          {categoryLabels[listing.category] || listing.category}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {listing.title}
                      </h3>
                      <p className="text-lg font-bold text-primary">
                        {listing.currency} {listing.price_per_unit.toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground">/{listing.unit}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {listing.quantity.toLocaleString()} {listing.unit} {t("trending.available")}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/30">
                        <div className="flex items-center gap-1 truncate">
                          {listing.county && (
                            <>
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{listing.county}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Eye className="w-3 h-3" />
                          <span>{listing.views_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 text-center"
        >
          <Button variant="hero-outline" size="lg" className="text-base" asChild>
            <Link to="/marketplace">
              <Store className="w-5 h-5 mr-2" />
              {t("trending.viewAll")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
