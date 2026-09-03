import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db/client";
import { addDaysIso } from "@/lib/dates";
import { invoiceOutstanding } from "@/lib/domain/invoice";
import { calculateTenderReadiness, matchRequirementToVault } from "@/lib/domain/tender-readiness";

export const DEMO = {
  password: "DemoPass123!",
  steve: "11111111-1111-4111-8111-111111111111",
  rose: "22222222-2222-4222-8222-222222222222",
  darius: "55555555-5555-4555-8555-555555555555",
  riftOwner: "66666666-6666-4666-8666-666666666666",
  acme: "33333333-3333-4333-8333-333333333333",
  rift: "44444444-4444-4444-8444-444444444444",
  customers: {
    kaa: "aaaa1111-1111-4111-8111-111111111111",
    safaricom: "aaaa2222-2222-4222-8222-222222222222",
    abc: "aaaa3333-3333-4333-8333-333333333333",
  },
  tender: "bbbb1111-1111-4111-8111-111111111111",
  poMissingGrn: "cccc1111-1111-4111-8111-111111111111",
  invoiceOverdue: "dddd1111-1111-4111-8111-111111111111",
};

export async function seedDemoData() {
  const existing = await queryOne("select id from organizations where id = $1", [DEMO.acme]);
  if (existing) return;

  const passwordHash = await bcrypt.hash(DEMO.password, 10);
  const trialEnd = addDaysIso(new Date(), 14);

  await query(
    `insert into profiles (id, email, full_name, phone, country, password_hash, email_verified_at)
     values ($1,$2,$3,$4,'KE',$5,now()), ($6,$7,$8,$9,'KE',$5,now()), ($10,$11,$12,$13,'KE',$5,now()), ($14,$15,$16,$17,'KE',$5,now())`,
    [
      DEMO.steve, "steve@acmesupplies.ke", "Steve Mwangi", "+254700000001", passwordHash,
      DEMO.rose, "rose@acmesupplies.ke", "Rose Njeri", "+254700000002",
      DEMO.darius, "darius@acmesupplies.ke", "Darius Otieno", "+254700000003",
      DEMO.riftOwner, "nina@riftvalley.ke", "Nina Chebet", "+254700000004",
    ],
  );

  await query(
    `insert into organizations (id, name, legal_name, trading_name, registration_number, tax_pin, country, currency, timezone, vat_registered, vat_rate, phone, email, website, address, business_type, onboarding_goals, onboarding_completed_at, created_by)
     values
     ($1,'Acme Supplies Kenya Ltd','Acme Supplies Kenya Ltd','Acme Supplies','PVT-2020-44821','P051234567K','KE','KES','Africa/Nairobi',true,16,'+254711223344','accounts@acmesupplies.ke','https://acmesupplies.ke','Industrial Area, Nairobi','General Supplier','["tenders","invoices","payments","compliance","purchase_orders"]'::jsonb, now(), $2),
     ($3,'Rift Valley Traders Ltd','Rift Valley Traders Ltd','Rift Traders','PVT-2018-11902','P059999999K','KE','KES','Africa/Nairobi',true,16,'+254722000111','hello@riftvalley.ke',null,'Nakuru','General Supplier','[]'::jsonb, now(), $4)`,
    [DEMO.acme, DEMO.steve, DEMO.rift, DEMO.riftOwner],
  );

  await query(
    `insert into organization_members (id, organization_id, user_id, role, status)
     values (gen_random_uuid(),$1,$2,'owner','active'),
            (gen_random_uuid(),$1,$3,'procurement','active'),
            (gen_random_uuid(),$1,$4,'finance','active'),
            (gen_random_uuid(),$1,$5,'viewer','active'),
            (gen_random_uuid(),$6,$5,'owner','active')`,
    [DEMO.acme, DEMO.steve, DEMO.rose, DEMO.darius, DEMO.riftOwner, DEMO.rift],
  );

  await query(
    `insert into subscriptions (id, organization_id, plan_id, status, trial_ends_at, current_period_end, provider)
     values (gen_random_uuid(),$1,'business','trialing',$2,$2,'development'),
            (gen_random_uuid(),$3,'starter','trialing',$2,$2,'development')`,
    [DEMO.acme, trialEnd, DEMO.rift],
  );

  await query(
    `insert into organization_settings (organization_id) values ($1), ($2)
     on conflict (organization_id) do nothing`,
    [DEMO.acme, DEMO.rift],
  );

  await query(
    `insert into customers (id, organization_id, name, type, industry, tax_pin, payment_terms_days, default_currency, address, phone, email, notes)
     values
     ($1,$2,'Kenya Airports Authority','parastatal','Aviation','P051111111A',30,'KES','KAA Headquarters, Nairobi','+254206611000','procurement@kaa.go.ke','Strategic aviation buyer'),
     ($3,$2,'Safaricom PLC','corporate','Telecommunications','P051234000S',30,'KES','Safaricom House, Waiyaki Way','+254722000000','ap@safaricom.co.ke','Enterprise network supplies'),
     ($4,$2,'ABC Manufacturing Ltd','private_business','Manufacturing','P058888888M',45,'KES','Industrial Area, Nairobi','+254733221100','procurement@abcmanufacturing.co.ke','Requires signed GRN before invoice')`,
    [DEMO.customers.kaa, DEMO.acme, DEMO.customers.safaricom, DEMO.customers.abc],
  );

  await query(
    `insert into customer_contacts (id, organization_id, customer_id, name, title, email, phone, is_primary)
     values
     (gen_random_uuid(),$1,$2,'Mercy Achieng','Procurement Officer','mercy.achieng@kaa.go.ke','+254722111222',true),
     (gen_random_uuid(),$1,$3,'Peter Kamau','Accounts Payable','peter.kamau@safaricom.co.ke','+254722333444',true),
     (gen_random_uuid(),$1,$4,'Jane Wanjiku','Buying Manager','jane.wanjiku@abcmanufacturing.co.ke','+254733221101',true)`,
    [DEMO.acme, DEMO.customers.kaa, DEMO.customers.safaricom, DEMO.customers.abc],
  );

  await query(
    `insert into company_documents (id, organization_id, name, category, document_number, issuing_authority, issue_date, expiry_date, coverage_year, country, tags, status)
     values
     (gen_random_uuid(),$1,'Certificate of Incorporation','company_registration','C.123456','Registrar of Companies','2018-03-12',null,null,'KE','["registration"]'::jsonb,'valid'),
     (gen_random_uuid(),$1,'KRA PIN Certificate','tax','P051234567K','Kenya Revenue Authority','2018-04-01',null,null,'KE','["pin"]'::jsonb,'valid'),
     (gen_random_uuid(),$1,'Tax Compliance Certificate','tax','KRA12345','Kenya Revenue Authority','2026-07-22','2027-07-22',null,'KE','["tax compliance","kra"]'::jsonb,'valid'),
     (gen_random_uuid(),$1,'Business Permit','licences','NCC-88921','Nairobi City County','2026-01-10','2026-09-26',null,'KE','["permit"]'::jsonb,'expiring_soon'),
     (gen_random_uuid(),$1,'Audited accounts 2024','audited_accounts','AA-2024','PWC Kenya','2025-04-30',null,2024,'KE','["accounts"]'::jsonb,'valid'),
     (gen_random_uuid(),$1,'Audited accounts 2025','audited_accounts','AA-2025','PWC Kenya','2026-04-30',null,2025,'KE','["accounts"]'::jsonb,'valid'),
     (gen_random_uuid(),$1,'CR12','company_registration','CR12-2026','Registrar of Companies','2026-06-01','2026-12-01',null,'KE','["cr12"]'::jsonb,'valid')`,
    [DEMO.acme],
  );

  await query(
    `insert into opportunities (id, organization_id, customer_id, title, estimated_value, probability, expected_close_date, source, owner_id, stage, notes)
     values
     (gen_random_uuid(),$1,$2,'ICT equipment framework',12500000,70,'2026-10-15','Tender portal',$3,'preparing_bid','Linked to KAA ICT tender'),
     (gen_random_uuid(),$1,$4,'Spare parts annual supply',6200000,40,'2026-11-30','Referral',$3,'qualified','Awaiting RFQ'),
     (gen_random_uuid(),$1,$5,'Network refresh phase 2',8900000,55,'2026-09-30','Repeat business',$3,'submitted','Proposal with Safaricom')`,
    [DEMO.acme, DEMO.customers.kaa, DEMO.steve, DEMO.customers.abc, DEMO.customers.safaricom],
  );

  await query(
    `insert into tenders (id, organization_id, customer_id, title, reference, procuring_entity, category, closing_date, closing_time, timezone, closing_at, submission_method, submission_location, tender_value, currency, tender_security_amount, tender_validity_period, status, assigned_to, readiness_percent)
     values ($1,$2,$3,'Supply and Delivery of ICT Equipment','KAA/ICT/024/2026','Kenya Airports Authority','ICT','2026-10-15','10:00','Africa/Nairobi','2026-10-15 07:00:00+00','Electronic and hard copy','KAA Headquarters, Procurement Office',12500000,'KES',250000,'120 days','preparing',$4,0)`,
    [DEMO.tender, DEMO.acme, DEMO.customers.kaa, DEMO.rose],
  );

  const vault = await query<{
    id: string;
    name: string;
    category: string;
    tags: string[] | string;
    expiry_date: string | null;
    coverage_year: number | null;
  }>("select id, name, category, tags, expiry_date, coverage_year from company_documents where organization_id = $1", [DEMO.acme]);

  const vaultDocs = vault.map((doc) => ({
    id: doc.id,
    name: doc.name,
    category: doc.category,
    tags: Array.isArray(doc.tags) ? doc.tags : JSON.parse(String(doc.tags || "[]")),
    expiryDate: doc.expiry_date,
    coverageYear: doc.coverage_year,
  }));

  const requirementTexts = [
    ["Valid Tax Compliance Certificate", "preliminary", true],
    ["CR12 dated within 3 months", "preliminary", true],
    ["Manufacturer Authorization Form", "preliminary", true],
    ["Audited accounts for last 3 years", "financial", true],
    ["Form of Tender signed and stamped", "forms", true],
    ["Technical brochures", "technical", false],
    ["Original plus two copies", "submission", true],
  ] as const;

  for (const [text, category, mandatory] of requirementTexts) {
    const match = matchRequirementToVault(text, vaultDocs, { now: new Date("2026-09-03") });
    await query(
      `insert into tender_requirements (id, organization_id, tender_id, requirement_text, category, source_document, page_number, mandatory, status, evidence_document_id, match_reason, confidence)
       values (gen_random_uuid(),$1,$2,$3,$4,'Tender document',8,$5,$6,$7,$8,$9)`,
      [DEMO.acme, DEMO.tender, text, category, mandatory, match.status, match.evidenceDocumentId, match.reason, match.confidence],
    );
  }

  const reqs = await query<{ category: string; mandatory: boolean; status: string }>(
    "select category, mandatory, status from tender_requirements where tender_id = $1",
    [DEMO.tender],
  );
  const readiness = calculateTenderReadiness(reqs);
  await query("update tenders set readiness_percent = $1 where id = $2", [readiness.percent, DEMO.tender]);

  await query(
    `insert into purchase_orders (id, organization_id, customer_id, number, issue_date, currency, payment_terms_days, payment_terms_text, delivery_location, delivery_deadline, contact_person, special_conditions, subtotal, tax, total, status, requires_grn)
     values
     ($1,$2,$3,'PO-2026-00482','2026-07-12','KES',45,'45 days after signed GRN and invoice','ABC Manufacturing, Industrial Area, Nairobi','2026-08-15','Jane Wanjiku','Signed GRN required before invoicing.',4181034.48,668965.52,4850000.00,'delivered',true),
     (gen_random_uuid(),$2,$4,'PO-2026-00110','2026-07-01','KES',30,'30 days from invoice','Safaricom House','2026-07-20','Peter Kamau',null,2068965.52,331034.48,2400000.00,'invoiced',true),
     (gen_random_uuid(),$2,$5,'PO-2026-00201','2026-08-10','KES',30,'30 days','KAA Stores','2026-09-20','Mercy Achieng',null,3100000,496000,3596000.00,'sourcing',true)`,
    [DEMO.poMissingGrn, DEMO.acme, DEMO.customers.abc, DEMO.customers.safaricom, DEMO.customers.kaa],
  );

  await query(
    `insert into purchase_order_items (id, organization_id, purchase_order_id, description, quantity, unit_price, tax, total)
     values (gen_random_uuid(),$1,$2,'Industrial pumps',10,250000,400000,2500000),
            (gen_random_uuid(),$1,$2,'Control panels',5,336206.90,268965.52,1681034.48)`,
    [DEMO.acme, DEMO.poMissingGrn],
  );

  await query(
    `insert into deliveries (id, organization_id, customer_id, purchase_order_id, number, delivery_date, location, delivered_by, received_by, status, notes)
     values (gen_random_uuid(),$1,$2,$3,'DN-2026-00482','2026-08-14','ABC Manufacturing, Industrial Area','James Kariuki','Store clerk','delivered','Awaiting signed GRN')`,
    [DEMO.acme, DEMO.customers.abc, DEMO.poMissingGrn],
  );

  const overdueOutstanding = invoiceOutstanding({
    total: "2400000.00",
    withholdingTax: "0",
    paidAmount: "0",
  });

  await query(
    `insert into invoices (id, organization_id, customer_id, number, issue_date, due_date, currency, subtotal, vat, withholding_tax, total, paid_amount, outstanding, etims_reference, status, next_action)
     values
     ($1,$2,$3,'INV-2026-0084','2026-07-21','2026-08-20','KES',2068965.52,331034.48,0,2400000,0,$4,'KRACU0123456789','overdue','Call accounts payable'),
     (gen_random_uuid(),$2,$5,'INV-2026-0091','2026-08-18','2026-09-17','KES',1500000,240000,0,1740000,0,1740000,null,'submitted','Confirm acknowledgement'),
     (gen_random_uuid(),$2,$6,'INV-2026-0072','2026-06-01','2026-07-01','KES',5000000,800000,0,5800000,5800000,0,'KRACU000111','paid',null)`,
    [DEMO.invoiceOverdue, DEMO.acme, DEMO.customers.safaricom, overdueOutstanding, DEMO.customers.kaa, DEMO.customers.abc],
  );

  await query(
    `insert into invoice_items (id, organization_id, invoice_id, description, quantity, unit_price, total)
     values (gen_random_uuid(),$1,$2,'Network switches',20,103448.28,2068965.52)`,
    [DEMO.acme, DEMO.invoiceOverdue],
  );

  await query(
    `insert into payments (id, organization_id, customer_id, payment_date, amount, currency, method, bank_reference, notes)
     values (gen_random_uuid(),$1,$2,'2026-07-12',5800000,'KES','bank_transfer','FT26212KE','Settlement for INV-2026-0072')`,
    [DEMO.acme, DEMO.customers.abc],
  );

  await query(
    `insert into suppliers (id, organization_id, name, category, contact_name, phone, email, tax_pin, location, products_services, payment_terms_days, rating, notes)
     values
     (gen_random_uuid(),$1,'Nairobi ICT Distributors','ICT','Ali Hassan','+254700111222','sales@nairobict.co.ke','P051001001K','Nairobi','Laptops, switches, printers',30,4.6,'Preferred ICT wholesaler'),
     (gen_random_uuid(),$1,'Mombasa Industrial Parts','Industrial','Grace Muli','+254700333444','quotes@mombasaindustrial.co.ke','P052002002M','Mombasa','Pumps and control gear',45,3.8,'Longer lead times')`,
    [DEMO.acme],
  );

  await query(
    `insert into rfqs (id, organization_id, number, title, description, required_delivery_date, location, currency, deadline, status)
     values (gen_random_uuid(),$1,'RFQ-2026-018','ICT accessories for KAA bid','Mice, docking stations and cables','2026-10-01','Nairobi','KES','2026-09-20 12:00:00+03','sent')`,
    [DEMO.acme],
  );

  await query(
    `insert into tasks (id, organization_id, title, description, entity_type, entity_id, assigned_to, priority, due_date, status)
     values
     (gen_random_uuid(),$1,'Request GRN for PO-2026-00482','Invoice blocked until signed GRN is uploaded','purchase_order',$2,$3,'urgent','2026-09-05','open'),
     (gen_random_uuid(),$1,'Follow up overdue INV-2026-0084','KES 2,400,000 overdue from Safaricom','invoice',$4,$5,'high','2026-09-04','open'),
     (gen_random_uuid(),$1,'Obtain Manufacturer Authorization','Mandatory for KAA/ICT/024/2026','tender',$6,$7,'urgent','2026-09-20','open'),
     (gen_random_uuid(),$1,'Upload 2023 audited accounts','Required for three-year financial capacity','tender',$6,$3,'high','2026-09-25','open'),
     (gen_random_uuid(),$1,'Renew Nairobi business permit','Expires 26 September 2026','company_document',null,$3,'medium','2026-09-19','open')`,
    [DEMO.acme, DEMO.poMissingGrn, DEMO.steve, DEMO.invoiceOverdue, DEMO.darius, DEMO.tender, DEMO.rose],
  );

  await query(
    `insert into notifications (id, organization_id, user_id, type, title, body, entity_type, entity_id)
     values
     (gen_random_uuid(),$1,$2,'invoice_overdue','Invoice INV-2026-0084 is overdue','Safaricom invoice of KES 2,400,000 is past due.','invoice',$3),
     (gen_random_uuid(),$1,$2,'grn_missing','GRN missing for PO-2026-00482','Delivery is complete but the signed GRN has not been uploaded.','purchase_order',$4),
     (gen_random_uuid(),$1,$2,'document_expiry','Business Permit expires in 23 days','Renew before 26 September 2026.','company_document',null),
     (gen_random_uuid(),$1,$5,'tender_deadline','KAA tender closes 15 October 2026 at 10:00 AM','Mandatory manufacturer authorization is still missing.','tender',$6)`,
    [DEMO.acme, DEMO.steve, DEMO.invoiceOverdue, DEMO.poMissingGrn, DEMO.rose, DEMO.tender],
  );

  await query(
    `insert into activity_events (id, organization_id, actor_id, actor_name, entity_type, entity_id, action, summary)
     values
     (gen_random_uuid(),$1,$2,'Steve Mwangi','purchase_order',$3,'uploaded','Steve uploaded PO-2026-00482.'),
     (gen_random_uuid(),$1,$4,'Rose Njeri','tender',$5,'status_changed','Rose changed Tender KAA/ICT/024/2026 status to Preparing.'),
     (gen_random_uuid(),$1,$6,'Darius Otieno','invoice',$7,'created','Darius created invoice INV-2026-0084.'),
     (gen_random_uuid(),$1,$6,'Darius Otieno','payment_followup',$7,'created','Darius added a payment follow-up.')`,
    [DEMO.acme, DEMO.steve, DEMO.poMissingGrn, DEMO.rose, DEMO.tender, DEMO.darius, DEMO.invoiceOverdue],
  );

  await query(
    `insert into payment_followups (id, organization_id, invoice_id, customer_id, type, follow_up_date, contact_name, notes, next_follow_up_date, created_by)
     values (gen_random_uuid(),$1,$2,$3,'email','2026-08-28','Peter Kamau','Sent first reminder. Promised to check with AP.','2026-09-04',$4)`,
    [DEMO.acme, DEMO.invoiceOverdue, DEMO.customers.safaricom, DEMO.darius],
  );
}
