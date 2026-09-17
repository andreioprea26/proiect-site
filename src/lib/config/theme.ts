/** Release-owned palettes only: no arbitrary CSS, fonts, URLs or database values. */
const neutrals = { foreground: "#ffffff", surface: "#ffffff", text: "#1c1917", muted: "#57534e", border: "#78716c" } as const;
export const THEMES = {
  evergreen: { ...neutrals, primary: "#065f46", hover: "#064e3b", accent: "#fef3c7", background: "#fbfaf6", tint: "#ecfdf5", strong: "#022c22", onStrong: "#d1fae5", focus: "#065f46" },
  plum: { ...neutrals, primary: "#701a75", hover: "#581c87", accent: "#fae8ff", background: "#fdf8fd", tint: "#f3e8ff", strong: "#3b0764", onStrong: "#f5d0fe", focus: "#701a75" },
  terracotta: { ...neutrals, primary: "#9a3412", hover: "#7c2d12", accent: "#ffedd5", background: "#fffaf5", tint: "#fff7ed", strong: "#431407", onStrong: "#fed7aa", focus: "#9a3412" },
} as const;

export type ThemeName = keyof typeof THEMES;
export function getTheme(value: unknown) {
  return THEMES[typeof value === "string" && Object.hasOwn(THEMES, value) ? value as ThemeName : "evergreen"];
}

/** Invalid runtime input fails closed to the default preset. */
export function themeVariables(value: unknown): Record<`--brand-${string}`, string> {
  return Object.fromEntries(Object.entries(getTheme(value)).map(([key, color]) => [`--brand-${key}`, color]));
}

export type BrandAssetKind = "logo" | "icon" | "ogImage";
export function brandAsset(value: unknown, kind: BrandAssetKind): string | null {
  if (typeof value !== "string") return null;
  const extension = kind === "ogImage" ? "(?:png|jpg|jpeg|webp)" : kind === "icon" ? "(?:png|ico|svg)" : "(?:png|jpg|jpeg|webp|svg)";
  // Flat, reviewed, versioned files only. No uploads, traversal, queries or remote URLs.
  return new RegExp(`^/branding/[a-zA-Z0-9][a-zA-Z0-9_-]*\\.${extension}$`).test(value) ? value : null;
}
