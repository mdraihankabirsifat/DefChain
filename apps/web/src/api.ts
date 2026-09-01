export interface DemoUser {
  id: string;
  username: string;
  organization: string;
  role: "INVESTIGATOR" | "PROVIDER_OFFICER" | "AUDITOR";
  active: boolean;
  queryBudget: number;
  queryCount: number;
}

const API = "/api/v1";
export async function request<T>(
  route: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("defchain_token");
  const response = await fetch(`${API}${route}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = response.status === 204 ? {} : await response.json();
  if (!response.ok)
    throw new Error(
      body.error?.message ??
        body.error?.code ??
        `Request failed (${response.status})`,
    );
  return body as T;
}

export async function login(
  username: string,
  password: string,
): Promise<DemoUser> {
  const result = await request<{ token: string; user: DemoUser }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ username, password }) },
  );
  localStorage.setItem("defchain_token", result.token);
  return result.user;
}
