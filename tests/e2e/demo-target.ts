export const DEMO_PROJECT_REF = "bfmihaxfleztajzyamio";

export function assertApprovedTestTarget(url: string) {
  const expected = process.env.E2E_APPROVED_PROJECT_REF;
  const hostname = new URL(url).hostname;
  if (new URL(url).origin !== `https://${hostname}` || new URL(url).username || new URL(url).password) {
    throw new Error("E2E target must be a direct HTTPS project origin");
  }
  if (expected) {
    if (expected !== DEMO_PROJECT_REF || hostname !== `${DEMO_PROJECT_REF}.supabase.co`) {
      throw new Error("Explicit E2E demo target mismatch; refusing to run.");
    }
  } else if (hostname !== "bdyocajhhylvasfhmnal.supabase.co") {
    throw new Error("Unapproved E2E target; refusing to run.");
  }
}
