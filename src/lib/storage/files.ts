import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { createDoc } from "@/lib/db/repo";
import { newId } from "@/lib/db/types";
import { firebaseWebConfig } from "@/lib/firebase/config";
import { isProduction } from "@/lib/config/runtime";

const MAGIC: Array<{ mime: string; bytes: number[] }> = [
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
];

export function sniffMime(buffer: Buffer, declared: string): string {
  for (const item of MAGIC) {
    if (item.bytes.every((byte, index) => buffer[index] === byte)) return item.mime;
  }
  if (declared.startsWith("text/")) return declared;
  return declared;
}

export function validateUpload(file: File, buffer: Buffer) {
  if (file.size > Number(process.env.MAX_UPLOAD_BYTES || MAX_UPLOAD_BYTES)) {
    throw new Error("File exceeds the 15MB upload limit.");
  }
  const mime = sniffMime(buffer, file.type || "application/octet-stream");
  if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(mime) && !mime.startsWith("text/")) {
    throw new Error("This file type is not allowed.");
  }
  return mime;
}

function storageDriver() {
  if (process.env.STORAGE_DRIVER) return process.env.STORAGE_DRIVER;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return "firebase";
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return "supabase";
  return "local";
}

export async function storeFile(input: {
  organizationId: string;
  userId: string;
  file: File;
}) {
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const mime = validateUpload(input.file, buffer);
  const id = newId();
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const safeName = input.file.name.replace(/[^\w.\-]+/g, "_");
  const relative = `${input.organizationId}/${id}-${safeName}`;
  const driver = storageDriver();

  if (driver === "firebase") {
    const { getFirebaseAdminApp } = await import("@/lib/firebase/admin-app");
    const { getStorage } = await import("firebase-admin/storage");
    const app = await getFirebaseAdminApp();
    const bucket = getStorage(app).bucket(firebaseWebConfig.storageBucket);
    const file = bucket.file(relative);
    await file.save(buffer, {
      contentType: mime,
      resumable: false,
      metadata: { cacheControl: "private, max-age=0" },
    });
  } else if (driver === "supabase" && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    );
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "organization-files";
    const { error } = await supabase.storage.from(bucket).upload(relative, buffer, {
      contentType: mime,
      upsert: false,
    });
    if (error) throw new Error(error.message);
  } else {
    if (isProduction()) {
      throw new Error("Local file storage is not allowed in production. Set STORAGE_DRIVER=firebase.");
    }
    const dir = path.join(process.cwd(), ".data", "uploads", input.organizationId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(process.cwd(), ".data", "uploads", relative), buffer);
  }

  await createDoc(
    "files",
    {
      organizationId: input.organizationId,
      path: relative,
      fileName: input.file.name,
      mimeType: mime,
      sizeBytes: buffer.length,
      checksum,
      driver,
      uploadedBy: input.userId,
    },
    id,
  );

  return { id, path: relative, mime, size: buffer.length, buffer, name: input.file.name, driver };
}

export async function readStoredFile(relativePath: string) {
  const driver = storageDriver();
  if (driver === "firebase") {
    const { getFirebaseAdminApp } = await import("@/lib/firebase/admin-app");
    const { getStorage } = await import("firebase-admin/storage");
    const app = await getFirebaseAdminApp();
    const bucket = getStorage(app).bucket(firebaseWebConfig.storageBucket);
    const [buffer] = await bucket.file(relativePath).download();
    return buffer;
  }
  return fs.readFile(path.join(process.cwd(), ".data", "uploads", relativePath));
}
