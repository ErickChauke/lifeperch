"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { destroyAsset } from "@/lib/cloudinary";
import {
  collectionSchema,
  documentSchema,
  type CollectionInput,
  type DocumentInput,
} from "@/lib/vault";

const VAULT_COOKIE = "vault_token";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// The opaque token stored in the unlock cookie: a hash of the PIN and the auth
// secret, so a forged cookie value cannot unlock the vault without the PIN.
function expectedToken(): string {
  const pin = process.env.VAULT_PIN ?? "";
  const secret = process.env.NEXTAUTH_SECRET ?? "";
  return createHash("sha256").update(`${pin}:${secret}`).digest("hex");
}

// Whether the vault is unlocked for this session (cookie matches the token).
export async function isVaultUnlocked(): Promise<boolean> {
  const store = await cookies();
  return store.get(VAULT_COOKIE)?.value === expectedToken();
}

// Verifies the PIN and, on success, sets the session unlock cookie.
export async function unlockVault(pin: string): Promise<{ ok: boolean }> {
  await requireUserId();
  if (!process.env.VAULT_PIN || pin !== process.env.VAULT_PIN) {
    return { ok: false };
  }
  const store = await cookies();
  store.set(VAULT_COOKIE, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/vault");
  return { ok: true };
}

// Clears the unlock cookie, re-locking the vault.
export async function lockVault(): Promise<void> {
  const store = await cookies();
  store.delete(VAULT_COOKIE);
  revalidatePath("/vault");
}

// Throws unless the user is signed in and the global vault is unlocked. Every
// card and document action sits behind this outer gate.
async function requireUnlockedVault(): Promise<string> {
  const userId = await requireUserId();
  if (!(await isVaultUnlocked())) throw new Error("Vault locked");
  return userId;
}

// --- Per-card password (a second, optional lock inside the vault) ---

// The salted hash stored on a card with a password. null means an open card.
function hashCardPassword(password: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "";
  return createHash("sha256").update(`${password}:${secret}`).digest("hex");
}

// The opaque token kept in a card's unlock cookie: a hash of the stored card
// hash and the auth secret, so the cookie cannot be reversed to the password.
function cardCookieToken(passwordHash: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "";
  return createHash("sha256").update(`${passwordHash}:${secret}`).digest("hex");
}

function cardCookieName(id: string): string {
  return `vault_card_${id}`;
}

function revalidateVault(id?: string) {
  revalidatePath("/vault");
  if (id) revalidatePath(`/vault/${id}`);
}

// --- Collections (cards) ---

// Fetches the user's cards, newest first, with their document counts.
export async function getCollections() {
  const userId = await requireUnlockedVault();
  return prisma.vaultCollection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { documents: true } } },
  });
}

// Fetches one card scoped to the user. Documents are included only when the
// card is open or the card has been unlocked this session.
export async function getCollection(id: string) {
  const userId = await requireUnlockedVault();
  const collection = await prisma.vaultCollection.findFirst({
    where: { id, userId },
  });
  if (!collection) return null;
  const unlocked = !collection.passwordHash || (await isCollectionUnlocked(id));
  const documents = unlocked
    ? await prisma.document.findMany({
        where: { userId, collectionId: id },
        orderBy: { createdAt: "desc" },
      })
    : [];
  return { ...collection, documents, unlocked };
}

// Creates a card, hashing its password when one is given. Returns the card so
// the UI can navigate straight into it.
export async function createCollection(input: CollectionInput) {
  const userId = await requireUnlockedVault();
  const data = collectionSchema.parse(input);
  const password = data.password?.trim();
  const collection = await prisma.vaultCollection.create({
    data: {
      userId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      passwordHash: password ? hashCardPassword(password) : null,
    },
  });
  revalidateVault(collection.id);
  return collection;
}

// Renames a card.
export async function renameCollection(id: string, title: string) {
  const userId = await requireUnlockedVault();
  const clean = title.trim();
  if (!clean) return;
  await prisma.vaultCollection.updateMany({
    where: { id, userId },
    data: { title: clean },
  });
  revalidateVault(id);
}

// Updates a card's description (empty clears it).
export async function updateCollectionDescription(id: string, description: string) {
  const userId = await requireUnlockedVault();
  await prisma.vaultCollection.updateMany({
    where: { id, userId },
    data: { description: description.trim() || null },
  });
  revalidateVault(id);
}

// Sets, changes, or removes a card's password. An empty password removes the
// lock. Either way the card's unlock cookie is cleared so it must be re-entered.
export async function setCollectionPassword(id: string, password: string | null) {
  const userId = await requireUnlockedVault();
  const clean = password?.trim();
  await prisma.vaultCollection.updateMany({
    where: { id, userId },
    data: { passwordHash: clean ? hashCardPassword(clean) : null },
  });
  const store = await cookies();
  store.delete(cardCookieName(id));
  revalidateVault(id);
}

// Deletes a card, its documents, and their Cloudinary assets.
export async function deleteCollection(id: string) {
  const userId = await requireUnlockedVault();
  const collection = await prisma.vaultCollection.findFirst({
    where: { id, userId },
  });
  if (!collection) return;
  const documents = await prisma.document.findMany({
    where: { userId, collectionId: id },
  });
  for (const doc of documents) {
    await destroyAsset(doc.publicId);
  }
  await prisma.vaultCollection.deleteMany({ where: { id, userId } });
  revalidateVault();
}

// Whether the given card is unlocked for this session (cookie matches token).
export async function isCollectionUnlocked(id: string): Promise<boolean> {
  const userId = await requireUserId();
  const collection = await prisma.vaultCollection.findFirst({
    where: { id, userId },
  });
  if (!collection) return false;
  if (!collection.passwordHash) return true;
  const store = await cookies();
  return (
    store.get(cardCookieName(id))?.value === cardCookieToken(collection.passwordHash)
  );
}

// Verifies a card's password and, on success, sets its unlock cookie.
export async function unlockCollection(
  id: string,
  password: string,
): Promise<{ ok: boolean }> {
  const userId = await requireUnlockedVault();
  const collection = await prisma.vaultCollection.findFirst({
    where: { id, userId },
  });
  if (!collection || !collection.passwordHash) return { ok: false };
  if (hashCardPassword(password) !== collection.passwordHash) return { ok: false };
  const store = await cookies();
  store.set(cardCookieName(id), cardCookieToken(collection.passwordHash), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidateVault(id);
  return { ok: true };
}

// Clears a card's unlock cookie, re-locking it.
export async function lockCollection(id: string): Promise<void> {
  const store = await cookies();
  store.delete(cardCookieName(id));
  revalidateVault(id);
}

// --- Documents ---

// Stores a document record after its file has been uploaded to Cloudinary. The
// target card must belong to the user and be unlocked.
export async function createDocument(collectionId: string, input: DocumentInput) {
  const userId = await requireUnlockedVault();
  const collection = await prisma.vaultCollection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!collection) throw new Error("Card not found");
  if (collection.passwordHash && !(await isCollectionUnlocked(collectionId))) {
    throw new Error("Card locked");
  }
  const data = documentSchema.parse(input);
  await prisma.document.create({
    data: {
      userId,
      collectionId,
      title: data.title.trim(),
      url: data.url,
      publicId: data.publicId,
      format: data.format ?? null,
      bytes: data.bytes ?? null,
    },
  });
  revalidateVault(collectionId);
}

// Deletes a document and its Cloudinary asset, scoped to the current user.
export async function deleteDocument(id: string) {
  const userId = await requireUnlockedVault();
  const doc = await prisma.document.findFirst({ where: { id, userId } });
  if (!doc) return;
  await destroyAsset(doc.publicId);
  await prisma.document.deleteMany({ where: { id, userId } });
  revalidateVault(doc.collectionId);
}
