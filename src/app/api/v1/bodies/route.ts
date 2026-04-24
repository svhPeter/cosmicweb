import { getAllBodies } from "@/data-platform/sources/bodies";
import { jsonEnvelope } from "@/data-platform/envelope";

export const revalidate = 3600;
export const dynamic = "force-static";

export async function GET() {
  const result = await getAllBodies();
  return jsonEnvelope(
    {
      data: result.data,
      attribution: result.attribution,
      meta: result.meta,
    },
    { cacheSeconds: 3600 }
  );
}
