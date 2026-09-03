-- Row Level Security for Supabase. Application code also enforces tenant checks.

create or replace function public.current_uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
    nullif(current_setting('app.user_id', true), '')::uuid
  );
$$;

create or replace function public.is_member_of(org uuid) returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members m
    where m.organization_id = org
      and m.user_id = public.current_uid()
      and m.status = 'active'
      and m.deleted_at is null
  );
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations','organization_members','invitations','subscriptions','usage_counters',
    'organization_settings','sequences','files','customers','customer_contacts','opportunities',
    'company_documents','suppliers','tenders','tender_documents','tender_requirements',
    'purchase_orders','purchase_order_items','deliveries','delivery_items','goods_receipts',
    'goods_receipt_items','invoices','invoice_items','payments','payment_allocations',
    'payment_followups','rfqs','rfq_items','rfq_suppliers','quotations','quotation_items',
    'tasks','notifications','activity_events','ai_jobs','document_extractions','notes'
  ]
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles
  for all using (id = public.current_uid())
  with check (id = public.current_uid());

drop policy if exists organizations_member on organizations;
create policy organizations_member on organizations
  for select using (public.is_member_of(id));
drop policy if exists organizations_update on organizations;
create policy organizations_update on organizations
  for update using (public.is_member_of(id));

drop policy if exists members_select on organization_members;
create policy members_select on organization_members
  for select using (public.is_member_of(organization_id));

-- Generic org isolation for remaining tenant tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'invitations','subscriptions','usage_counters','organization_settings','sequences','files',
    'customers','customer_contacts','opportunities','company_documents','suppliers','tenders',
    'tender_documents','tender_requirements','purchase_orders','purchase_order_items','deliveries',
    'delivery_items','goods_receipts','goods_receipt_items','invoices','invoice_items','payments',
    'payment_allocations','payment_followups','rfqs','rfq_items','rfq_suppliers','quotations',
    'quotation_items','tasks','notifications','activity_events','ai_jobs','document_extractions','notes'
  ]
  loop
    execute format('drop policy if exists %I_tenant_all on %I', t, t);
    execute format(
      'create policy %I_tenant_all on %I for all using (public.is_member_of(organization_id)) with check (public.is_member_of(organization_id))',
      t, t
    );
  end loop;
end $$;
