export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { bootstrapDatabase } = await import("@/lib/db/bootstrap");
  await bootstrapDatabase();
}
