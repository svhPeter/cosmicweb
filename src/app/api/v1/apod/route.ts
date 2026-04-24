import { getApod } from "@/data-platform/sources/apod";
import { jsonEnvelope } from "@/data-platform/envelope";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getApod();
  return jsonEnvelope(
    {
      data: result.data,
      attribution: result.attribution,
      meta: result.meta,
    },
    { cacheSeconds: 60 * 30 }
  );
}
