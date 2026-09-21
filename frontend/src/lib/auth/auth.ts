export type VisitorProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  marketingConsent?: boolean;
  passSource?: "eventbrite" | "direct";
  role?: "visitor" | "organiser";
  csrfToken?: string | null;
};

export type AuthChallenge = {
  challengeId: string;
  email: string;
  mode: "register" | "login" | "attendee";
  demoCode?: string;
};

const profilesKey = "ij26.demoProfiles";
const sessionKey = "ij26.visitorSession";
const demoCode = "260926";

function readProfiles(): VisitorProfile[] {
  try {
    return JSON.parse(localStorage.getItem(profilesKey) || "[]") as VisitorProfile[];
  } catch {
    return [];
  }
}

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

const seedAuth = {
  current: (): VisitorProfile | null => {
    try {
      return JSON.parse(sessionStorage.getItem(sessionKey) || "null") as VisitorProfile | null;
    } catch {
      return null;
    }
  },
  requestRegistration: async (profile: VisitorProfile): Promise<AuthChallenge> => ({
    challengeId: btoa(JSON.stringify({ profile: { ...profile, email: normaliseEmail(profile.email) }, createdAt: Date.now() })),
    email: normaliseEmail(profile.email),
    mode: "register",
    demoCode
  }),
  requestLogin: async (email: string): Promise<AuthChallenge> => {
    const normalised = normaliseEmail(email);
    if (!readProfiles().some((profile) => profile.email === normalised)) throw new Error("No account found for that email. Register first in demo mode.");
    return { challengeId: btoa(JSON.stringify({ email: normalised, createdAt: Date.now() })), email: normalised, mode: "login", demoCode };
  },
  requestEventbriteAccess: async (profile: Pick<VisitorProfile, "firstName" | "lastName" | "email">): Promise<AuthChallenge> => ({
    challengeId: btoa(JSON.stringify({ profile: { ...profile, phone: "", email: normaliseEmail(profile.email), passSource: "eventbrite" }, createdAt: Date.now() })),
    email: normaliseEmail(profile.email),
    mode: "attendee",
    demoCode
  }),
  verify: async (challenge: AuthChallenge, code: string): Promise<VisitorProfile> => {
    if (code !== demoCode) throw new Error("That code is not correct. Use the demo code shown above.");
    const payload = JSON.parse(atob(challenge.challengeId)) as { profile?: VisitorProfile; email?: string; createdAt: number };
    if (Date.now() - payload.createdAt > 10 * 60 * 1000) throw new Error("That code has expired. Request a new one.");
    const profiles = readProfiles();
    const profile = challenge.mode === "register" || challenge.mode === "attendee" ? payload.profile : profiles.find((item) => item.email === payload.email);
    if (!profile) throw new Error("We could not find that visitor profile.");
    if (challenge.mode === "register" || challenge.mode === "attendee") {
      const next = [...profiles.filter((item) => item.email !== profile.email), profile];
      localStorage.setItem(profilesKey, JSON.stringify(next));
    }
    sessionStorage.setItem(sessionKey, JSON.stringify(profile));
    return profile;
  },
  logout: () => sessionStorage.removeItem(sessionKey)
};

const apiAuth = {
  current: async (): Promise<VisitorProfile | null> => {
    const response = await fetch("/api/auth/session", { credentials: "include" });
    return response.ok ? (await response.json() as VisitorProfile) : null;
  },
  requestRegistration: (profile: VisitorProfile) => postChallenge("/api/auth/register", profile),
  requestLogin: (email: string) => postChallenge("/api/auth/code", { email: normaliseEmail(email) }),
  requestEventbriteAccess: (profile: Pick<VisitorProfile, "firstName" | "lastName" | "email">) => postChallenge("/api/auth/eventbrite", profile),
  verify: async (challenge: AuthChallenge, code: string): Promise<VisitorProfile> => {
    const response = await fetch("/api/auth/verify", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: challenge.challengeId, code })
    });
    if (!response.ok) throw new Error(await apiError(response, "We could not verify that code."));
    return response.json() as Promise<VisitorProfile>;
  },
  logout: async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); }
};

async function postChallenge(url: string, body: unknown): Promise<AuthChallenge> {
  const response = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(await apiError(response, "We could not send your sign-in code. Please try again."));
  return response.json() as Promise<AuthChallenge>;
}

async function apiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

const configuredProvider = import.meta.env.VITE_AUTH_PROVIDER ?? import.meta.env.VITE_DATA_PROVIDER;
// Production builds use the real auth API unless a seed build explicitly opts out.
const useApi = configuredProvider ? configuredProvider === "api" : import.meta.env.PROD;

export const auth = {
  usesApi: useApi,
  current: async () => useApi ? apiAuth.current() : seedAuth.current(),
  requestRegistration: (profile: VisitorProfile) => useApi ? apiAuth.requestRegistration(profile) : seedAuth.requestRegistration(profile),
  requestLogin: (email: string) => useApi ? apiAuth.requestLogin(email) : seedAuth.requestLogin(email),
  requestEventbriteAccess: (profile: Pick<VisitorProfile, "firstName" | "lastName" | "email">) => useApi ? apiAuth.requestEventbriteAccess(profile) : seedAuth.requestEventbriteAccess(profile),
  verify: (challenge: AuthChallenge, code: string) => useApi ? apiAuth.verify(challenge, code) : seedAuth.verify(challenge, code),
  logout: async () => { if (useApi) await apiAuth.logout(); else seedAuth.logout(); }
};
