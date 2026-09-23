import type { PassportState } from "../storage/localFestival";

export type MembershipReward = {
  code: string;
  discountPercent: number;
  status: string;
  issuedAt: string;
  emailSentAt?: string | null;
};

async function message(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

export async function getMembershipReward(): Promise<MembershipReward | null> {
  const response = await fetch("/api/membership-reward", { credentials: "include" });
  if (!response.ok) return null;
  const body = await response.json() as { reward: MembershipReward | null };
  return body.reward;
}

export async function claimMembershipReward(csrfToken: string, passport: PassportState): Promise<MembershipReward> {
  const passportResponse = await fetch("/api/passport", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ state: passport })
  });
  if (!passportResponse.ok) throw new Error(await message(passportResponse, "We could not sync your trail stamps."));

  const response = await fetch("/api/membership-reward", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }
  });
  if (!response.ok) throw new Error(await message(response, "We could not email your reward."));
  const body = await response.json() as { reward: MembershipReward };
  return body.reward;
}
