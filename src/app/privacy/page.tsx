import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-muted-foreground underline">
        {APP_NAME}
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated 4 September 2026.</p>
      <div className="mt-8 space-y-4 text-sm leading-6 text-muted-foreground">
        <p>
          We collect account details (name, work email, phone, organization profile), operational records you enter
          (tenders, invoices, files), and technical logs needed to keep the service secure.
        </p>
        <p>
          Data is stored in Google Cloud / Firebase for the project configured in this deployment. File uploads go to
          Firebase Storage. Billing events are processed by Paystack. We do not sell customer data.
        </p>
        <p>
          Organization owners can request export or deletion of their workspace data. Email verification and password
          reset tokens are hashed at rest. Session cookies are httpOnly and signed.
        </p>
        <p>
          Contact the workspace owner listed on your invoice, or the operator of this deployment, for privacy requests.
          This policy is intended for Kenyan suppliers and other African businesses using the product.
        </p>
      </div>
    </main>
  );
}
