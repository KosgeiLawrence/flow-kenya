import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Eye, Package, Clock } from "lucide-react";
import MaterialIcon from "@/components/dashboard/shared/MaterialIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: string;
  material_type: string | null;
  quantity: number;
  unit: string;
  price_per_unit: number;
  currency: string;
  images: string[];
  location: string | null;
  county: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  condition: string;
  status: string;
  views_count: number;
  created_at: string;
  seller_role: string;
  seller_profile?: {
    full_name: string;
    avatar_url: string | null;
    organizations?: { name: string } | null;
  };
}

const categoryLabels: Record<string, string> = {
  raw_material: "Raw Material",
  recycled_product: "Recycled Product",
  equipment: "Equipment",
  service: "Service",
};

const conditionLabels: Record<string, string> = {
  new: "New",
  used: "Used",
  bulk: "Bulk",
};

const roleLabels: Record<string, string> = {
  waste_picker: "Waste Picker",
  aggregator: "Aggregator",
  recycler: "Recycler",
};

const roleBadgeColors: Record<string, string> = {
  waste_picker: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  aggregator: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  recycler: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function MarketplaceListingCard({ listing, isPublic = false }: { listing: Listing; isPublic?: boolean }) {
  const [open, setOpen] = useState(false);
  const totalPrice = listing.price_per_unit * listing.quantity;
  const sellerName = listing.seller_profile?.organizations?.name || listing.seller_profile?.full_name || "Seller";

  return (
    <>
      <Card className="group hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden" onClick={() => setOpen(true)}>
        {/* Image */}
        <div className="relative h-40 bg-muted/30 overflow-hidden">
          {listing.images?.length > 0 ? (
            <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1.5">
            <Badge className={`text-[10px] border ${roleBadgeColors[listing.seller_role] || "bg-muted"}`}>
              {roleLabels[listing.seller_role] || listing.seller_role}
            </Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-[10px]">
              {conditionLabels[listing.condition] || listing.condition}
            </Badge>
          </div>
        </div>

        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground line-clamp-1">{listing.title}</h3>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MaterialIcon iconName={null} className="w-3.5 h-3.5 text-primary" />
            <span>{categoryLabels[listing.category] || listing.category}</span>
            {listing.material_type && <span>· {listing.material_type}</span>}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-primary">{listing.currency} {listing.price_per_unit.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/{listing.unit}</span></p>
              <p className="text-[10px] text-muted-foreground">{listing.quantity.toLocaleString()} {listing.unit} available</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
            <div className="flex items-center gap-1">
              {listing.location && <><MapPin className="w-3 h-3" /><span className="truncate max-w-[80px]">{listing.location}</span></>}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{listing.title}</DialogTitle>
          </DialogHeader>

          {/* Images carousel */}
          {listing.images?.length > 0 && (
            <div className="relative h-56 rounded-lg overflow-hidden bg-muted/30">
              <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
              {listing.images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {listing.images.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? "bg-primary" : "bg-white/50"}`} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={`border ${roleBadgeColors[listing.seller_role] || ""}`}>
              {roleLabels[listing.seller_role] || listing.seller_role}
            </Badge>
            <Badge variant="outline">{categoryLabels[listing.category]}</Badge>
            {listing.material_type && <Badge variant="outline">{listing.material_type}</Badge>}
            <Badge variant="secondary">{conditionLabels[listing.condition]}</Badge>
          </div>

          {/* Pricing */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-1">
            <p className="text-2xl font-bold text-primary">{listing.currency} {listing.price_per_unit.toLocaleString()}<span className="text-sm font-normal text-muted-foreground"> / {listing.unit}</span></p>
            <p className="text-sm text-muted-foreground">Quantity: <strong className="text-foreground">{listing.quantity.toLocaleString()} {listing.unit}</strong></p>
            <p className="text-sm text-muted-foreground">Total Value: <strong className="text-foreground">{listing.currency} {totalPrice.toLocaleString()}</strong></p>
          </div>

          {/* Description */}
          {listing.description && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          {/* Location */}
          {(listing.location || listing.county) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{[listing.location, listing.county].filter(Boolean).join(", ")}</span>
            </div>
          )}

          {/* Seller info */}
          <div className="border-t border-border pt-3 space-y-2">
            <h4 className="text-sm font-semibold">Seller</h4>
            <div className="flex items-center gap-3">
              {listing.seller_profile?.avatar_url ? (
                <img src={listing.seller_profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {sellerName[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{sellerName}</p>
                <p className="text-xs text-muted-foreground">{roleLabels[listing.seller_role]}</p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Contact Seller</h4>
            {listing.contact_phone && (
              <a href={`tel:${listing.contact_phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Phone className="w-4 h-4" /> {listing.contact_phone}
              </a>
            )}
            {listing.contact_email && (
              <a href={`mailto:${listing.contact_email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Mail className="w-4 h-4" /> {listing.contact_email}
              </a>
            )}
            {listing.contact_phone && (
              <a
                href={`https://wa.me/${listing.contact_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in your listing: "${listing.title}" on Duara Flow Marketplace.`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full mt-2 bg-[#25D366] hover:bg-[#128C7E] text-white">
                  💬 WhatsApp Seller
                </Button>
              </a>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Eye className="w-3 h-3" /> {listing.views_count} views · Listed {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
