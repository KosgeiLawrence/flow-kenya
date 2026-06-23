
-- Admin invoices/receipts table for Duara Flow billing
CREATE TABLE public.admin_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL DEFAULT ('DF-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4)),
  document_type TEXT NOT NULL DEFAULT 'invoice' CHECK (document_type IN ('invoice', 'quotation', 'receipt')),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_organization TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  vat_percent NUMERIC NOT NULL DEFAULT 16,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  notes TEXT,
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  related_payment_id UUID,
  related_subscription_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all invoices"
  ON public.admin_invoices FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_admin_invoices_updated_at
  BEFORE UPDATE ON public.admin_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
