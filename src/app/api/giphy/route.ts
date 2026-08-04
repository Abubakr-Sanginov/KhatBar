import { NextRequest, NextResponse } from "next/server"

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || process.env.NEXT_PUBLIC_GIPHY_API_KEY || ""

const TYPES: Record<string, string> = {
  gifs: "gifs",
  stickers: "stickers",
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = TYPES[searchParams.get("type") || "gifs"] || "gifs"
    const q = searchParams.get("q")?.trim() || ""
    const offset = searchParams.get("offset") || "0"
    const trending = searchParams.get("trending") === "1"

    if (!GIPHY_API_KEY) {
      return NextResponse.json({ error: "GIPHY API key not configured" }, { status: 500 })
    }

    const endpoint = trending
      ? `https://api.giphy.com/v1/${type}/trending`
      : `https://api.giphy.com/v1/${type}/search`
    const params = new URLSearchParams({
      api_key: GIPHY_API_KEY,
      limit: "21",
      offset,
      rating: "g",
    })
    if (q && !trending) params.set("q", q)

    const res = await fetch(`${endpoint}?${params}`)
    if (!res.ok) {
      return NextResponse.json({ error: "GIPHY request failed" }, { status: 502 })
    }
    const data = await res.json()

    const items = (data.data || []).map((g: { id: string; images?: { fixed_height?: { url?: string }; original?: { url?: string }; fixed_width_downsampled?: { webp?: string } } }) => ({
      id: g.id,
      url: g.images?.fixed_height?.url || g.images?.original?.url,
      preview: g.images?.fixed_width_downsampled?.webp || g.images?.fixed_height?.url,
    }))

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
