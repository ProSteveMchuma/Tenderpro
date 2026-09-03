import { uploadVaultDocumentAction } from "@/app/actions/records";
import { PageHeader } from "@/components/shared/chrome";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { VAULT_CATEGORIES } from "@/lib/constants";

export default function NewVaultDocumentPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="Upload company document" description="AI will extract certificate numbers and expiry dates when possible." />
      <form action={uploadVaultDocumentAction} className="rounded-xl border border-border/80 bg-card p-6 shadow-xs">
        <Field label="Document name" name="name" />
        <Field label="Category">
          <select name="category" className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
            {VAULT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Document number" name="documentNumber" />
        <Field label="Issuing authority" name="issuingAuthority" />
        <Field label="Issue date" name="issueDate" type="date" />
        <Field label="Expiry date" name="expiryDate" type="date" />
        <Field label="Tags" name="tags" />
        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium">File</span>
          <input type="file" name="file" className="block w-full text-sm" />
        </label>
        <Button type="submit">Save to vault</Button>
      </form>
    </div>
  );
}
