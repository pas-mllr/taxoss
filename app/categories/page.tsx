import { permanentRedirect } from "next/navigation";

/** The taxonomy grew into the Stack page; old links follow it there. */
export default function CategoriesRedirect() {
  permanentRedirect("/stack");
}
