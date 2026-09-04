import { afterEach, describe, expect, it, vi } from "vitest";
import { assertProductionConfig, isDemoMode, isProduction, sessionSecret } from "@/lib/config/runtime";

describe("runtime config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("treats development as demo unless DEMO_MODE=false", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_MODE", "");
    expect(isProduction()).toBe(false);
    expect(isDemoMode()).toBe(true);
    vi.stubEnv("DEMO_MODE", "false");
    expect(isDemoMode()).toBe(false);
  });

  it("treats production as non-demo unless DEMO_MODE=true", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "");
    expect(isProduction()).toBe(true);
    expect(isDemoMode()).toBe(false);
    vi.stubEnv("DEMO_MODE", "true");
    expect(isDemoMode()).toBe(true);
  });

  it("rejects placeholder session secrets in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "dev-only-change-me");
    expect(() => sessionSecret()).toThrow(/SESSION_SECRET/);
    vi.stubEnv("SESSION_SECRET", "a-long-random-production-secret");
    expect(sessionSecret()).toBe("a-long-random-production-secret");
  });

  it("skips production config assertions during next build", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(() => assertProductionConfig()).not.toThrow();
  });

  it("requires Firebase credentials and app URL at production runtime", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "");
    vi.stubEnv("SESSION_SECRET", "a-long-random-production-secret");
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", "");
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_PATH", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com");
    expect(() => assertProductionConfig()).toThrow(/FIREBASE_SERVICE_ACCOUNT/);
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", '{"type":"service_account"}');
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(() => assertProductionConfig()).toThrow(/NEXT_PUBLIC_APP_URL/);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com");
    expect(() => assertProductionConfig()).not.toThrow();
  });
});
