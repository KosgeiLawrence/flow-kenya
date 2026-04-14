import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrash } from "@/hooks/useTrash";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Trash2, Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface ComplianceDocUploadProps {
  documentTypes: { value: string; label: string }[];
  title?: string;
}

const ComplianceDocUpload = ({ documentTypes, title = "Compliance Documents" }: ComplianceDocUploadProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["compliance_documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { softDelete } = useTrash();

  const handleDeleteDoc = async (doc: any) => {
    const success = await softDelete("compliance_documents", doc.id, doc, doc.document_name);
    if (success) {
      // Also remove from storage
      const urlParts = doc.file_url.split("/compliance-documents/");
      if (urlParts[1]) {
        await supabase.storage.from("compliance-documents").remove([urlParts[1]]);
      }
      queryClient.invalidateQueries({ queryKey: ["compliance_documents"] });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedType) {
      toast.error("Please select a document type first");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("compliance-documents")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("compliance-documents")
        .getPublicUrl(path);

      const { error: dbError } = await supabase.from("compliance_documents").insert({
        user_id: user.id,
        document_type: selectedType,
        document_name: file.name,
        file_url: urlData.publicUrl,
        file_type: ext || null,
        notes: notes || null,
      });
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["compliance_documents"] });
      toast.success("Document uploaded successfully");
      setSelectedType("");
      setNotes("");
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadDoc = async (fileUrl: string, name: string) => {
    const urlParts = fileUrl.split("/compliance-documents/");
    if (!urlParts[1]) return;
    const { data, error } = await supabase.storage
      .from("compliance-documents")
      .download(urlParts[1]);
    if (error || !data) {
      toast.error("Download failed");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeLabel = (val: string) => documentTypes.find((t) => t.value === val)?.label || val;

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Upload className="w-4 h-4 mr-1" /> Upload
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Compliance Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Document Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details..."
                  maxLength={500}
                />
              </div>
              <div>
                <Label>File (PDF, image, max 10MB)</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={handleUpload}
                  disabled={uploading || !selectedType}
                />
                {uploading && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !documents?.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">No documents uploaded yet. Click Upload to add compliance documents.</p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.document_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">{typeLabel(doc.document_type)}</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                  </div>
                  {doc.notes && <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => downloadDoc(doc.file_url, doc.document_name)}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDeleteDoc(doc)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComplianceDocUpload;
