import { isVaultUnlocked, getCollections } from "@/actions/vault";
import { VaultGate } from "@/components/modules/vault/vault-gate";
import { VaultBoard } from "@/components/modules/vault/vault-board";

// Vault. Locked by default: nothing about the contents renders until the PIN
// unlocks it for the session. Once open it shows a board of collection cards.
export default async function VaultPage() {
  const unlocked = await isVaultUnlocked();
  if (!unlocked) return <VaultGate />;
  const collections = await getCollections();
  return <VaultBoard collections={collections} />;
}
