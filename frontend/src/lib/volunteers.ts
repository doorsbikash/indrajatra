export type VolunteerStatus = "pending" | "approved" | "checked_in" | "signed_off";

export type Volunteer = {
  id: number;
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  assistanceArea: string;
  status: VolunteerStatus;
  sashIssued: boolean;
  badgeIssued: boolean;
  radioIssued: boolean;
  otherItems: string;
  sashReturned: boolean;
  badgeReturned: boolean;
  radioReturned: boolean;
  otherItemsReturned: boolean;
  approvedAt: string | null;
  checkedInAt: string | null;
  signedOffAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VolunteerRegistration = Pick<Volunteer, "firstName" | "lastName" | "email" | "phone" | "assistanceArea">;

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...options });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "The volunteer service is unavailable.");
  return payload;
}

export function registerVolunteer(registration: VolunteerRegistration) {
  return api<{ ok: true; reference: string; status: VolunteerStatus; existing?: boolean }>("/api/volunteers/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registration)
  });
}

export function getVolunteers() {
  return api<{ volunteers: Volunteer[] }>("/api/admin/volunteers");
}

export function updateVolunteer(id: number, csrfToken: string, input: Record<string, unknown>) {
  return api<{ volunteer: Volunteer }>(`/api/admin/volunteers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(input)
  });
}

export function outstandingItems(volunteer: Volunteer): string[] {
  const items: string[] = [];
  if (volunteer.sashIssued && !volunteer.sashReturned) items.push("Sash");
  if (volunteer.badgeIssued && !volunteer.badgeReturned) items.push("Badge");
  if (volunteer.radioIssued && !volunteer.radioReturned) items.push("Walkie-talkie");
  if (volunteer.otherItems && !volunteer.otherItemsReturned) items.push(volunteer.otherItems);
  return items;
}
