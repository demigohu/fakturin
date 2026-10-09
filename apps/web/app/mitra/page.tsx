import { redirect } from "next/navigation";

// PRD v2: settlement is done by the seller and the vault; the partner screen is gone.
export default function PartnerRemoved() {
  redirect("/pasar");
}
