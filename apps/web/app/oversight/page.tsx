import { redirect } from "next/navigation";

/** The old role-select page is gone. One auth page rules them all. */
export default function OversightIndex() {
  redirect("/auth");
}
