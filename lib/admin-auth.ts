import getMongoClient, { dbName } from "./mongodb";
import { emailConfigured } from "./email-config";
import { getSession } from "./session";

/** Returns the signed-in admin and database, or null. Checks the account itself, so removed admins lose access at once. */
export async function getAdmin() {
  const session = await getSession();
  const signedInByCode = (session as { method?: string } | null)?.method === "email-code";
  if (!session || session.role !== "admin" || (emailConfigured() && !signedInByCode)) return null;
  const db = (await getMongoClient()).db(dbName);
  const account = await db.collection("users").findOne({ email: session.email });
  if (!account || account.role !== "admin") return null;
  return { session, db };
}
