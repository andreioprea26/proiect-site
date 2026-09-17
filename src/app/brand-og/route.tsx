import { ImageResponse } from "next/og";

// Static, generic last-resort image. No request/DB data, remote assets or fonts.
export const dynamic = "force-static";
export function GET() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#f5f5f4", color: "#1c1917", fontSize: 72 }}>Magazin online</div>,
    { width: 1200, height: 630 },
  );
}
