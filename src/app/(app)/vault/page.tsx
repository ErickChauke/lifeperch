import { isVaultUnlocked, getDocuments } from "@/actions/vault";
import { VaultGate } from "@/components/modules/vault/vault-gate";
import { VaultGrid } from "@/components/modules/vault/vault-grid";

// Vault. Locked by default: nothing about the contents renders until the PIN
// unlocks it for the session.
export default async function VaultPage() {
  const unlocked = await isVaultUnlocked();
  if (!unlocked) return <VaultGate />;
  const documents = await getDocuments();
  return <VaultGrid documents={documents} />;
}
