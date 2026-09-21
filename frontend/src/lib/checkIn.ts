export type CheckedInAttendee = {
  id: number;
  firstName: string;
  lastName: string;
  ticketType: string;
  checkedInAt: string | null;
};

export type CheckInSummary = {
  total: number;
  checkedIn: number;
  remaining: number;
  recent: CheckedInAttendee[];
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...options });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "The attendee check-in service is unavailable.");
  return payload;
}

export function getCheckInSummary() {
  return api<CheckInSummary>("/api/admin/check-ins");
}

export function checkInTicket(code: string, csrfToken: string) {
  return api<{ status: "checked_in" | "already_checked_in"; attendee: CheckedInAttendee }>("/api/admin/check-ins/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ code })
  });
}
