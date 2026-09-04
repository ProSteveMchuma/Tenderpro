import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoMode, isProduction, sessionSecret } from "@/lib/config/runtime";

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
});
