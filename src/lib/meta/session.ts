import { cookies } from "next/headers";
import { COOKIE } from "./config";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export async function getMetaSession() {
  const store = await cookies();
  const token = store.get(COOKIE.token)?.value;
  const userName = store.get(COOKIE.user)?.value;
  const adAccountRaw = store.get(COOKIE.account)?.value;
  let adAccount: { id: string; name: string; currency: string } | undefined;
  if (adAccountRaw) {
    try {
      adAccount = JSON.parse(adAccountRaw) as { id: string; name: string; currency: string };
    } catch {
      adAccount = undefined;
    }
  }
  return { token, userName, adAccount };
}

export async function setMetaSession(input: {
  token: string;
  userName: string;
  adAccount?: { id: string; name: string; currency: string };
}) {
  const store = await cookies();
  store.set(COOKIE.token, input.token, { ...base, maxAge: 60 * 60 * 24 * 55 });
  store.set(COOKIE.user, input.userName, { ...base, maxAge: 60 * 60 * 24 * 55 });
  if (input.adAccount) {
    store.set(COOKIE.account, JSON.stringify(input.adAccount), {
      ...base,
      maxAge: 60 * 60 * 24 * 55,
    });
  }
}

export async function setAdAccountCookie(adAccount: {
  id: string;
  name: string;
  currency: string;
}) {
  const store = await cookies();
  store.set(COOKIE.account, JSON.stringify(adAccount), {
    ...base,
    maxAge: 60 * 60 * 24 * 55,
  });
}

export async function clearMetaSession() {
  const store = await cookies();
  store.delete(COOKIE.token);
  store.delete(COOKIE.user);
  store.delete(COOKIE.account);
  store.delete(COOKIE.state);
}

export async function setOauthState(state: string) {
  const store = await cookies();
  store.set(COOKIE.state, state, { ...base, maxAge: 60 * 10 });
}

export async function readOauthState() {
  const store = await cookies();
  return store.get(COOKIE.state)?.value;
}
