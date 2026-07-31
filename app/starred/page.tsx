import { permanentRedirect } from "next/navigation";

/** The starred list moved under Workspace; old bookmarks still land there. */
export default function StarredPage() {
  permanentRedirect("/my-projects?tab=shortlist");
}
