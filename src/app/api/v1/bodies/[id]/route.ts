import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getBody } from "@/data-platform/sources/bodies";
import { jsonEnvelope } from "@/data-platform/envelope";

export const revalidate = 3600;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getBody(id);
  if (!result) {
    return NextResponse.json(
      {
        error: { code: "not_found", message: `No celestial body with id "${id}".` },
      },
      { status: 404 }
    );
  }
  return jsonEnvelope(
    {
      data: result.data,
      attribution: result.attribution,
      meta: result.meta,
    },
    { cacheSeconds: 3600 }
  );
}
