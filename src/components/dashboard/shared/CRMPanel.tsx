import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrash } from "@/hooks/useTrash";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users, Plus, Search, Filter, Upload, Edit2, Trash2, Phone, Mail,
  MapPin, ShoppingBag, ArrowUpDown, Eye, X, FileSpreadsheet, ChevronLeft
} from "lucide-react";
import { format } from "date-fns";

interface Customer {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  category: string;
  notes: string | null;
  total_transactions: number;
  total_revenue: number;
  last_transaction_date: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ["general", "regular", "vip", "corporate", "wholesale", "retail"];

interface CRMPanelProps {
  role: string;
}

const CRMPanel = ({ role }: CRMPanelProps) => {
  const { user } = useAuth();
  const { softDelete } = useTrash();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "revenue" | "recent">("name");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", location: "", category: "general", notes: ""
  });

  const fetchCustomers = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setCustomers(data as Customer[]);
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, [user]);

  const fetchCustomerTransactions = async (customer: Customer) => {
    if (!user) return;
    const { data } = await supabase
      .from("financial_transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "income")
      .ilike("description", `%${customer.full_name}%`)
      .order("transaction_date", { ascending: false })
      .limit(20);
    setTransactions(data || []);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ full_name: "", phone: "", email: "", location: "", category: "general", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      full_name: c.full_name, phone: c.phone || "", email: c.email || "",
      location: c.location || "", category: c.category, notes: c.notes || ""
    });
    setDialogOpen(true);
  };

  const openView = async (c: Customer) => {
    setViewCustomer(c);
    await fetchCustomerTransactions(c);
  };

  const handleSave = async () => {
    if (!user || !form.full_name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (editing) {
      const { error } = await supabase.from("customers").update({
        full_name: form.full_name.trim(),
        phone: form.phone || null, email: form.email || null,
        location: form.location || null, category: form.category,
        notes: form.notes || null, updated_at: new Date().toISOString()
      }).eq("id", editing.id);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Customer updated");
    } else {
      const { error } = await supabase.from("customers").insert({
        user_id: user.id, full_name: form.full_name.trim(),
        phone: form.phone || null, email: form.email || null,
        location: form.location || null, category: form.category,
        notes: form.notes || null
      });
      if (error) { toast.error("Failed to add customer"); return; }
      toast.success("Customer added");
    }
    setDialogOpen(false);
    fetchCustomers();
  };

  const handleDelete = async (c: Customer) => {
    const success = await softDelete("customers", c.id, c as any, c.full_name);
    if (success) fetchCustomers();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "txt"].includes(ext || "")) {
      toast.error("Please upload a CSV file");
      return;
    }

    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) { toast.error("File is empty or has no data rows"); return; }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const nameIdx = headers.findIndex(h => h.includes("name"));
    const phoneIdx = headers.findIndex(h => h.includes("phone"));
    const emailIdx = headers.findIndex(h => h.includes("email"));
    const locationIdx = headers.findIndex(h => h.includes("location") || h.includes("address"));
    const categoryIdx = headers.findIndex(h => h.includes("category") || h.includes("type"));

    if (nameIdx === -1) { toast.error("CSV must have a 'name' column"); return; }

    const rows = lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      return {
        user_id: user.id,
        full_name: cols[nameIdx] || "",
        phone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
        email: emailIdx >= 0 ? cols[emailIdx] || null : null,
        location: locationIdx >= 0 ? cols[locationIdx] || null : null,
        category: categoryIdx >= 0 && CATEGORIES.includes(cols[categoryIdx]?.toLowerCase()) 
          ? cols[categoryIdx].toLowerCase() : "general",
      };
    }).filter(r => r.full_name);

    if (!rows.length) { toast.error("No valid rows found"); return; }

    const { error } = await supabase.from("customers").insert(rows);
    if (error) { toast.error("Import failed"); return; }
    toast.success(`${rows.length} customers imported`);
    fetchCustomers();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filtered = customers
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.full_name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q);
      const matchCat = categoryFilter === "all" || c.category === categoryFilter;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sortBy === "revenue") return b.total_revenue - a.total_revenue;
      if (sortBy === "recent") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      return a.full_name.localeCompare(b.full_name);
    });

  const stats = {
    total: customers.length,
    vip: customers.filter(c => c.category === "vip").length,
    totalRevenue: customers.reduce((s, c) => s + Number(c.total_revenue), 0),
    active: customers.filter(c => c.last_transaction_date && 
      new Date(c.last_transaction_date) > new Date(Date.now() - 30 * 86400000)).length
  };

  if (viewCustomer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setViewCustomer(null)} className="gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to Customers
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {viewCustomer.full_name}
                  <Badge variant="outline" className="capitalize text-xs">{viewCustomer.category}</Badge>
                </CardTitle>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  {viewCustomer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{viewCustomer.phone}</span>}
                  {viewCustomer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{viewCustomer.email}</span>}
                  {viewCustomer.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{viewCustomer.location}</span>}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => openEdit(viewCustomer)}>
                <Edit2 className="w-3 h-3 mr-1" /> Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">{viewCustomer.total_transactions}</p>
                <p className="text-xs text-muted-foreground">Transactions</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">KES {Number(viewCustomer.total_revenue).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {viewCustomer.last_transaction_date ? format(new Date(viewCustomer.last_transaction_date), "dd MMM") : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Last Sale</p>
              </div>
            </div>
            {viewCustomer.notes && (
              <div className="bg-muted/30 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{viewCustomer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No linked transactions found</p>
            ) : (
              <div className="space-y-2">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{t.description || "Sale"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(t.transaction_date), "dd MMM yyyy")}</p>
                    </div>
                    <p className="text-sm font-bold text-primary">KES {Number(t.amount).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active (30d)</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-gold" />
            <div>
              <p className="text-xl font-bold">{stats.vip}</p>
              <p className="text-xs text-muted-foreground">VIP</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xl font-bold">KES {stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={openAdd} className="gap-1"><Plus className="w-4 h-4" /> Add Customer</Button>
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1">
          <Upload className="w-4 h-4" /> Import CSV
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[130px]"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-[130px]"><ArrowUpDown className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="recent">Recent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No customers yet. Add your first customer!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <Card key={c.id} className="p-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openView(c)}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {c.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.full_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {c.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{c.phone}</span>}
                        {c.location && <span className="flex items-center gap-0.5 hidden sm:flex"><MapPin className="w-3 h-3" />{c.location}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-medium">KES {Number(c.total_revenue).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{c.total_transactions} sales</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-[10px] hidden sm:inline-flex">{c.category}</Badge>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Customer name" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location / Address" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes about this customer" rows={2} />
            </div>
            <Button className="w-full" onClick={handleSave}>{editing ? "Update" : "Add Customer"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMPanel;
