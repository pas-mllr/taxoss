import { permanentRedirect } from "next/navigation";
import { areEditorialPagesEnabled } from "@/lib/site-features";

/** The taxonomy grew into the Stack page; old links follow it there. */
export default function CategoriesRedirect() {
  permanentRedirect(areEditorialPagesEnabled() ? "/stack" : "/");
}
