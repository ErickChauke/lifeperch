import { notFound } from "next/navigation";
import {
  isVaultUnlocked,
  getCollection,
  isCollectionUnlocked,
} from "@/actions/vault";
import { VaultGate } from "@/components/modules/vault/vault-gate";
import { CardGate } from "@/components/modules/vault/card-gate";
import { CardDetailView } from "@/components/modules/vault/card-detail";

// One vault card. Gated by the global vault PIN first, then by the card's own
// password when it has one.
export default async function VaultCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await isVaultUnlocked())) return <VaultGate />;

  const collection = await getCollection(id);
  if (!collection) notFound();

  if (collection.passwordHash && !(await isCollectionUnlocked(id))) {
    return <CardGate id={collection.id} title={collection.title} />;
  }

  return <CardDetailView collection={collection} />;
}
