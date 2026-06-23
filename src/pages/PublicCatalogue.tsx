import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Phone, Mail, Globe, Package, Store, MessageCircle, Share2, ArrowLeft, Loader2 } from "lucide-react";

interface Item {
  id: string; title: string; description: string | null; category: string;
  material_type: string | null; price_per_unit: number; unit: string; currency: string;
  quantity: number | null; images: string[] | null;
}
interface CataloguePayload {
  catalogue: {
    id: string; slug: string; business_name: string; tagline: string | null;
    about: string | null; banner_url: string | null; logo_url: string | null; theme_color: string | null;
    contact_phone: string | null; contact_email: string | null; contact_whatsapp: string | null;
    website: string | null; physical_address: string | null;
    county: string | null; sub_county: string | null; view_count: number;
  };
  items: Item[];
  seller: { full_name: string; avatar_url: string | null; role: string | null };
  organization: { name: string; logo_url: string | null; description: string | null } | null;
}

const roleLabels: Record<string, string> = {
  waste_picker: "Waste Picker", aggregator: "Aggregator", recycler: "Recycler",
};

export default function PublicCatalogue() {
  const { slug = "" } = useParams();
  const [search] = useSearchParams();
  const isEmbed = search.get("embed") === "1";
  const [selected, setSelected] = useState<Item | null>(null);

  const { data, isLoading, error } = useQuery<CataloguePayload | null>({
    queryKey: ["public_catalogue", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_catalogue", { _slug: slug });
      if (error) throw error;
      return data as any;
    },
  });

  // Bump view counter once
  useEffect(() => {
    if (!slug) return;
    supabase.rpc("increment_catalogue_view", { _slug: slug }).then(() => {});
  }, [slug]);

  
  const themeStyle = useMemo(() => ({
    "--brand": data?.catalogue?.theme_color || "#2b5e3f",
  } as React.CSSProperties), [data?.catalogue?.theme_color]);

  // SEO — must be before any early returns
  useEffect(() => {
    const c = data?.catalogue;
    if (!c) return;
    document.title = `${c.business_name} — Product Catalogue | Twende Green Ecocycle`;
    const desc = c.tagline || c.about?.slice(0, 155) || `Browse products from ${c.business_name} on Twende Green Ecocycle.`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) { metaDesc = document.createElement("meta"); metaDesc.setAttribute("name", "description"); document.head.appendChild(metaDesc); }
    metaDesc.setAttribute("content", desc);
  }, [data?.catalogue]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }
  if (error || !data || !data.catalogue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <Store className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Catalogue not found</h1>
        <p className="text-muted-foreground mb-6">This catalogue may have been removed or unpublished.</p>
        <Link to="/marketplace"><Button>Browse marketplace</Button></Link>
      </div>
    );
  }

  const c = data.catalogue;
  const businessName = c.business_name;
  const items = data.items || [];
  const orgLogo = c.logo_url || data.organization?.logo_url || data.seller.avatar_url;
  const fullAddress = [c.physical_address, c.sub_county, c.county].filter(Boolean).join(", ");
  const waUrl = c.contact_whatsapp
    ? `https://wa.me/${c.contact_whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${businessName}, I saw your catalogue and I'm interested in your products.`)}`
    : null;

  const sharePage = async () => {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      try { await navigator.share({ title: businessName, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="min-h-screen bg-background" style={themeStyle}>

      {/* Top bar (hidden in embed) */}
      {!isEmbed && (
        <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/marketplace" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Marketplace
            </Link>
            <Button variant="outline" size="sm" onClick={sharePage} className="gap-2"><Share2 className="w-4 h-4" />Share</Button>
          </div>
        </div>
      )}

      {/* HERO */}
      <header
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 70%, black) 100%)` }}
      >
        {c.banner_url && (
          <img src={c.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20 text-white">
          <div className="flex items-start gap-5">
            {orgLogo ? (
              <img src={orgLogo} alt={businessName} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover ring-4 ring-white/20 shrink-0" />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/15 flex items-center justify-center text-3xl font-bold shrink-0">
                {businessName[0]}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">{businessName}</h1>
              {c.tagline && <p className="text-base md:text-lg text-white/85 mt-1">{c.tagline}</p>}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {data.seller.role && <Badge className="bg-white/15 hover:bg-white/20 text-white border-0">{roleLabels[data.seller.role] || data.seller.role}</Badge>}
                {c.county && <Badge className="bg-white/15 hover:bg-white/20 text-white border-0 gap-1"><MapPin className="w-3 h-3" />{c.county}</Badge>}
                <Badge className="bg-white/15 hover:bg-white/20 text-white border-0">{items.length} products</Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-10 space-y-10">
        {/* About + Contact */}
        <section className="grid md:grid-cols-3 gap-5">
          <Card className="md:col-span-2">
            <CardContent className="p-5">
              <h2 className="font-display font-bold text-lg mb-2">About</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {c.about || data.organization?.description || `Welcome to ${businessName}'s catalogue. Browse our products below or get in touch.`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="font-display font-bold text-lg">Get in touch</h2>
              {c.contact_phone && (
                <a href={`tel:${c.contact_phone}`} className="flex items-center gap-2 text-sm hover:text-primary"><Phone className="w-4 h-4 text-primary" />{c.contact_phone}</a>
              )}
              {c.contact_email && (
                <a href={`mailto:${c.contact_email}`} className="flex items-center gap-2 text-sm hover:text-primary"><Mail className="w-4 h-4 text-primary" />{c.contact_email}</a>
              )}
              {c.website && (
                <a href={c.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-primary"><Globe className="w-4 h-4 text-primary" />{c.website.replace(/^https?:\/\//, "")}</a>
              )}
              {fullAddress && (
                <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />{fullAddress}</p>
              )}
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noreferrer" className="block">
                  <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"><MessageCircle className="w-4 h-4" />WhatsApp us</Button>
                </a>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl flex items-center gap-2"><Package className="w-5 h-5" style={{ color: "var(--brand)" }} />Our Products</h2>
            <span className="text-sm text-muted-foreground">{items.length} items</span>
          </div>
          {!items.length ? (
            <Card><CardContent className="p-10 text-center">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No products listed yet. Check back soon!</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="cursor-pointer overflow-hidden group hover:shadow-lg transition" onClick={() => setSelected(item)}>
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-muted-foreground/30" /></div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                    {item.material_type && <p className="text-[10px] text-muted-foreground">{item.material_type}</p>}
                    <p className="text-base font-bold mt-1" style={{ color: "var(--brand)" }}>
                      {item.currency} {Number(item.price_per_unit).toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground">/{item.unit}</span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Powered by <Link to="/" className="text-primary hover:underline font-medium">Twende Green Ecocycle</Link> · Circular economy platform
          </p>
        </footer>
      </main>

      {/* Item dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.title}</DialogTitle></DialogHeader>
              {selected.images?.[0] && (
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img src={selected.images[0]} alt={selected.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-2xl font-bold" style={{ color: "var(--brand)" }}>
                  {selected.currency} {Number(selected.price_per_unit).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground"> / {selected.unit}</span>
                </p>
                {selected.material_type && <Badge variant="outline">{selected.material_type}</Badge>}
                {selected.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.description}</p>}
                {selected.quantity ? (
                  <p className="text-sm text-muted-foreground">Available: <strong className="text-foreground">{Number(selected.quantity).toLocaleString()} {selected.unit}</strong></p>
                ) : null}
              </div>
              {waUrl && (
                <a href={`https://wa.me/${c.contact_whatsapp?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${businessName}, I'm interested in: ${selected.title}`)}`} target="_blank" rel="noreferrer">
                  <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"><MessageCircle className="w-4 h-4" />Inquire on WhatsApp</Button>
                </a>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
