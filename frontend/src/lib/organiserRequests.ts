export type OrganiserRequestStatus = "pending" | "approved" | "rejected";

export type OrganiserRequest = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  assistanceArea: string;
  message: string;
  status: OrganiserRequestStatus;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganiserUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  isCurrent: boolean;
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...options });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "The organiser access service is unavailable.");
  return payload;
}

export function getMyOrganiserRequest() {
  return api<{ request: OrganiserRequest | null }>("/api/organiser-request");
}

export function submitOrganiserRequest(csrfToken: string, input: { assistanceArea: string; message: string }) {
  return api<{ request: OrganiserRequest }>("/api/organiser-request", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(input)
  });
}

export function getOrganiserRequests() {
  return api<{ requests: OrganiserRequest[] }>("/api/admin/organiser-requests");
}

export function reviewOrganiserRequest(id: number, csrfToken: string, action: "approve" | "reject") {
  return api<{ request: OrganiserRequest }>(`/api/admin/organiser-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ action })
  });
}

export function getOrganisers() {
  return api<{ organisers: OrganiserUser[] }>("/api/admin/organisers");
}

export function removeOrganiser(id: number, csrfToken: string) {
  return api<{ ok: true }>(`/api/admin/organisers/${id}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken }
  });
}
