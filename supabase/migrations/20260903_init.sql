-- SupplierOS Africa — core schema
-- Compatible with Supabase Postgres and local PGlite.

create table if not exists schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key,
  email text not null unique,
  full_name text not null,
  phone text,
  country text not null default 'KE',
  avatar_url text,
  password_hash text,
  email_verified_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists organizations (
  id uuid primary key,
  name text not null,
  legal_name text,
  trading_name text,
  registration_number text,
  tax_pin text,
  country text not null default 'KE',
  currency text not null default 'KES',
  timezone text not null default 'Africa/Nairobi',
  vat_registered boolean not null default true,
  vat_rate numeric(6,3) not null default 16.000,
  phone text,
  email text,
  website text,
  address text,
  business_type text,
  onboarding_goals jsonb not null default '[]'::jsonb,
  onboarding_completed_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists organization_members (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','procurement','finance','operations','viewer')),
  status text not null default 'active' check (status in ('invited','active','disabled')),
  invited_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, user_id)
);

create table if not exists invitations (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null,
  token_hash text not null,
  invited_by uuid references profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key,
  organization_id uuid not null unique references organizations(id) on delete cascade,
  plan_id text not null,
  status text not null default 'trialing',
  billing_interval text not null default 'monthly',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  provider text not null default 'development',
  provider_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists usage_counters (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  period text not null,
  ai_analyses integer not null default 0,
  invoices integer not null default 0,
  storage_bytes bigint not null default 0,
  unique (organization_id, period)
);

create table if not exists organization_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  reminder_days jsonb not null default '[90,60,30,14,7,1]'::jsonb,
  quotation_weights jsonb not null default '{"price":25,"compliance":20,"delivery":15,"warranty":10,"paymentTerms":10,"technical":10,"supplierRating":10}'::jsonb,
  notification_preferences jsonb not null default '{"inApp":true,"email":true,"whatsapp":false}'::jsonb,
  withholding_tax_rate numeric(6,3) not null default 0,
  invoice_prefix text not null default 'INV',
  po_prefix text not null default 'PO',
  tender_prefix text not null default 'TDR',
  rfq_prefix text not null default 'RFQ',
  require_grn_before_invoice boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists sequences (
  organization_id uuid not null references organizations(id) on delete cascade,
  kind text not null,
  next_number integer not null default 1,
  primary key (organization_id, kind)
);

create table if not exists files (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  bucket text not null default 'organization-files',
  path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  checksum text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists customers (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  type text not null default 'corporate',
  industry text,
  tax_pin text,
  payment_terms_days integer not null default 30,
  default_currency text not null default 'KES',
  address text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists customers_org_idx on customers(organization_id) where deleted_at is null;

create table if not exists customer_contacts (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists opportunities (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id),
  title text not null,
  estimated_value numeric(18,2) not null default 0,
  currency text not null default 'KES',
  probability integer not null default 10,
  expected_close_date date,
  source text,
  owner_id uuid references profiles(id),
  stage text not null default 'identified',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists company_documents (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  file_id uuid references files(id),
  name text not null,
  category text not null,
  document_number text,
  issuing_authority text,
  issue_date date,
  expiry_date date,
  coverage_year integer,
  country text default 'KE',
  tags jsonb not null default '[]'::jsonb,
  notes text,
  status text not null default 'valid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists suppliers (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  category text,
  contact_name text,
  phone text,
  email text,
  tax_pin text,
  location text,
  products_services text,
  payment_terms_days integer default 30,
  rating numeric(3,2) default 3.00,
  quality_rating numeric(3,2) default 3.00,
  on_time_rating numeric(3,2) default 3.00,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists tenders (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id),
  opportunity_id uuid references opportunities(id),
  title text not null,
  reference text,
  procuring_entity text,
  category text,
  closing_date date,
  closing_time text,
  timezone text not null default 'Africa/Nairobi',
  closing_at timestamptz,
  submission_method text,
  submission_location text,
  tender_value numeric(18,2),
  currency text not null default 'KES',
  tender_security_amount numeric(18,2),
  tender_validity_period text,
  site_visit_date date,
  pre_bid_meeting_date date,
  clarification_deadline date,
  status text not null default 'draft',
  assigned_to uuid references profiles(id),
  readiness_percent integer not null default 0,
  analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists tender_documents (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  tender_id uuid not null references tenders(id) on delete cascade,
  file_id uuid references files(id),
  kind text not null default 'source',
  extracted_text text,
  created_at timestamptz not null default now()
);

create table if not exists tender_requirements (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  tender_id uuid not null references tenders(id) on delete cascade,
  requirement_text text not null,
  category text not null,
  source_document text,
  page_number integer,
  mandatory boolean not null default true,
  status text not null default 'missing',
  evidence_document_id uuid references company_documents(id),
  assigned_to uuid references profiles(id),
  due_date date,
  notes text,
  match_reason text,
  confidence text not null default 'review_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists purchase_orders (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id),
  tender_id uuid references tenders(id),
  number text not null,
  issue_date date,
  currency text not null default 'KES',
  payment_terms_days integer not null default 30,
  payment_terms_text text,
  delivery_location text,
  delivery_deadline date,
  contact_person text,
  special_conditions text,
  subtotal numeric(18,2) not null default 0,
  tax numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0,
  status text not null default 'received',
  requires_grn boolean not null default true,
  file_id uuid references files(id),
  extraction jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, number)
);

create table if not exists purchase_order_items (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  description text not null,
  quantity numeric(18,3) not null default 1,
  unit_price numeric(18,2) not null default 0,
  tax numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0
);

create table if not exists deliveries (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id),
  purchase_order_id uuid references purchase_orders(id),
  number text not null,
  delivery_date date,
  location text,
  delivered_by text,
  received_by text,
  status text not null default 'scheduled',
  notes text,
  proof_file_id uuid references files(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists delivery_items (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  delivery_id uuid not null references deliveries(id) on delete cascade,
  description text not null,
  quantity numeric(18,3) not null default 0
);

create table if not exists goods_receipts (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id),
  purchase_order_id uuid references purchase_orders(id),
  delivery_id uuid references deliveries(id),
  number text not null,
  grn_date date,
  status text not null default 'draft',
  file_id uuid references files(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists goods_receipt_items (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  goods_receipt_id uuid not null references goods_receipts(id) on delete cascade,
  description text not null,
  quantity numeric(18,3) not null default 0
);

create table if not exists invoices (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id),
  purchase_order_id uuid references purchase_orders(id),
  goods_receipt_id uuid references goods_receipts(id),
  number text not null,
  issue_date date not null,
  due_date date not null,
  currency text not null default 'KES',
  subtotal numeric(18,2) not null default 0,
  vat numeric(18,2) not null default 0,
  withholding_tax numeric(18,2) not null default 0,
  other_deductions numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0,
  paid_amount numeric(18,2) not null default 0,
  outstanding numeric(18,2) not null default 0,
  etims_reference text,
  status text not null default 'draft',
  file_id uuid references files(id),
  last_follow_up_at date,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, number)
);

create table if not exists invoice_items (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(18,3) not null default 1,
  unit_price numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0
);

create table if not exists payments (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id),
  payment_date date not null,
  amount numeric(18,2) not null,
  currency text not null default 'KES',
  method text not null default 'bank_transfer',
  bank_reference text,
  mpesa_reference text,
  withholding_tax numeric(18,2) not null default 0,
  other_deductions numeric(18,2) not null default 0,
  notes text,
  file_id uuid references files(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists payment_allocations (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  payment_id uuid not null references payments(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(18,2) not null
);

create table if not exists payment_followups (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  customer_id uuid references customers(id),
  type text not null,
  follow_up_date date not null,
  contact_name text,
  notes text,
  promise_to_pay_date date,
  next_follow_up_date date,
  generated_message text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists rfqs (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  number text not null,
  title text not null,
  description text,
  required_delivery_date date,
  location text,
  currency text not null default 'KES',
  deadline timestamptz,
  status text not null default 'draft',
  file_id uuid references files(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists rfq_items (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  rfq_id uuid not null references rfqs(id) on delete cascade,
  description text not null,
  quantity numeric(18,3) not null default 1
);

create table if not exists rfq_suppliers (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  rfq_id uuid not null references rfqs(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade
);

create table if not exists quotations (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  rfq_id uuid references rfqs(id),
  supplier_id uuid references suppliers(id),
  supplier_name text,
  currency text not null default 'KES',
  validity text,
  delivery_period text,
  payment_terms text,
  warranty text,
  total numeric(18,2) not null default 0,
  score numeric(6,2),
  file_id uuid references files(id),
  extraction jsonb,
  selected boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists quotation_items (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  quotation_id uuid not null references quotations(id) on delete cascade,
  description text not null,
  brand text,
  model text,
  quantity numeric(18,3) not null default 1,
  unit_price numeric(18,2) not null default 0,
  vat numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0
);

create table if not exists tasks (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  entity_type text,
  entity_id uuid,
  assigned_to uuid references profiles(id),
  priority text not null default 'medium',
  due_date date,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists notifications (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id),
  type text not null,
  title text not null,
  body text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists activity_events (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references profiles(id),
  actor_name text,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_org_idx on activity_events(organization_id, created_at desc);

create table if not exists ai_jobs (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  capability text not null,
  status text not null default 'queued',
  entity_type text,
  entity_id uuid,
  input_excerpt text,
  output jsonb,
  error text,
  confidence text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists document_extractions (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  file_id uuid references files(id),
  document_type text,
  extracted_text text,
  metadata jsonb,
  confidence text,
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  body text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists password_reset_tokens (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tenders_org_idx on tenders(organization_id) where deleted_at is null;
create index if not exists po_org_idx on purchase_orders(organization_id) where deleted_at is null;
create index if not exists invoices_org_status_idx on invoices(organization_id, status) where deleted_at is null;
create index if not exists invoices_due_idx on invoices(organization_id, due_date) where deleted_at is null;
create index if not exists vault_expiry_idx on company_documents(organization_id, expiry_date) where deleted_at is null;
create index if not exists notifications_user_idx on notifications(organization_id, user_id, created_at desc);
