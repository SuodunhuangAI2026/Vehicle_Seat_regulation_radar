const ADMIN_REPOSITORY = {
  owner: "SuodunhuangAI2026",
  name: "Vehicle_Seat_regulation_radar",
} as const;

const SESSION_KEY = "seatscope.admin.github-session";
const SESSION_TTL_MS = 30 * 60 * 1000;

export interface AdminSession {
  token: string;
  login: string;
  verifiedAt: number;
}

interface GitHubUser {
  login?: string;
}

interface GitHubRepository {
  full_name?: string;
  permissions?: {
    push?: boolean;
  };
}

async function githubRequest<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("GitHub 令牌无效或已过期。");
    }
    throw new Error(`GitHub 权限校验失败（HTTP ${response.status}）。`);
  }

  return (await response.json()) as T;
}

export async function verifyGithubAdminToken(
  rawToken: string,
): Promise<AdminSession> {
  const token = rawToken.trim();
  if (!token) {
    throw new Error("请输入 GitHub 访问令牌。");
  }

  const user = await githubRequest<GitHubUser>("/user", token);
  if (!user.login) {
    throw new Error("无法识别 GitHub 账号。");
  }

  const repository = await githubRequest<GitHubRepository>(
    `/repos/${ADMIN_REPOSITORY.owner}/${ADMIN_REPOSITORY.name}`,
    token,
  );
  const expectedRepository =
    `${ADMIN_REPOSITORY.owner}/${ADMIN_REPOSITORY.name}`.toLowerCase();

  if (repository.full_name?.toLowerCase() !== expectedRepository) {
    throw new Error("令牌未关联本网站仓库。");
  }
  if (repository.permissions?.push !== true) {
    throw new Error("该 GitHub 账号没有本仓库的写入权限。");
  }

  return {
    token,
    login: user.login,
    verifiedAt: Date.now(),
  };
}

export function readAdminSession(): AdminSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as Partial<AdminSession>;
    if (
      typeof session.token !== "string" ||
      typeof session.login !== "string" ||
      typeof session.verifiedAt !== "number" ||
      Date.now() - session.verifiedAt > SESSION_TTL_MS
    ) {
      clearAdminSession();
      return null;
    }

    return session as AdminSession;
  } catch {
    clearAdminSession();
    return null;
  }
}

export function saveAdminSession(session: AdminSession): void {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearAdminSession(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
}
