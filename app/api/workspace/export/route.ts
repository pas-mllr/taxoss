import { createPortfolioCsv } from "@/lib/portfolio-export";
import { getPortfolioWorkspace } from "@/lib/portfolio";
import { ensureCurrentUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await ensureCurrentUser();
  if (!userId) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const workspace = await getPortfolioWorkspace(userId);
  const generatedAt = new Date().toISOString();
  const date = generatedAt.slice(0, 10);
  return new Response(createPortfolioCsv(workspace, generatedAt), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="taxoss-portfolio-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
