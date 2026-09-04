import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-muted-foreground underline">
        {APP_NAME}
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Terms of service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated 4 September 2026.</p>
      <div className="mt-8 space-y-4 text-sm leading-6 text-muted-foreground">
        <p>
          SupplierOS Africa is a multi-tenant workspace for supplier operations: tenders, compliance, purchase orders,
          deliveries, invoices and collections. By creating an account you agree to use the service for lawful business
          purposes and to keep login credentials confidential.
        </p>
        <p>
          Each organization owns its records. You are responsible for the accuracy of data you upload, including tender
          documents, invoices and certificates. We do not replace government e-procurement portals, IFMIS, or tax filing
          systems.
        </p>
        <p>
          Paid plans are billed in Kenyan shillings through Paystack (or another configured processor). Trials convert to
          a paid subscription only after a successful checkout. You may cancel at the end of the current billing period.
        </p>
        <p>
          We may suspend accounts that abuse the service, attempt to access another organization&apos;s data, or violate
          applicable Kenyan law. These terms are governed by the laws of Kenya.
        </p>
      </div>
    </main>
  );
}
