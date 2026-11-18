import { closeMonth, previousMonthKey } from "@/lib/services/seasons";

/**
 * Cron Vercel (vercel.json) : le 1er de chaque mois à 03:00 UTC, clôture le mois précédent.
 * Protégé par CRON_SECRET (Vercel envoie "Authorization: Bearer <CRON_SECRET>").
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const key = previousMonthKey();
  const season = await closeMonth(key);
  return Response.json({ month: key, closed: Boolean(season), winnerId: season?.winnerId ?? null });
}
