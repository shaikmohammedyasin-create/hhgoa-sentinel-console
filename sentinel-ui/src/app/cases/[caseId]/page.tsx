import { Suspense } from "react";
import { Console } from "@/components/console/Console";

/**
 * A deep link to one case. The same console, opened on it.
 *
 * The console is one screen rather than a set of pages, so this route does
 * not render a different thing — it renders the console with a selection, so
 * a link pasted into a chat lands where the sender was looking.
 *
 * `force-static` so the route exports to a single HTML file in the single-URL
 * demo; the `caseId` param is passed to the client and `Console` handles it
 * from there.
 */

// Static export — the case deep link is resolved client-side.
export const dynamic = "force-static";

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return (
    <Suspense>
      <Console initialCase={caseId} />
    </Suspense>
  );
}
