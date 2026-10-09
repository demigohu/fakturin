import { redirect } from "next/navigation";

// PRD v2: buyers no longer use the app (silent factoring). Old links land on the public check.
export default function BuyerRemoved() {
  redirect("/cek");
}
