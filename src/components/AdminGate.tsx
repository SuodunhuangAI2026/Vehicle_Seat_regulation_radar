import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  readAdminSession,
  saveAdminSession,
  verifyGithubAdminToken,
} from "../lib/admin-access";

type GateState = "checking" | "locked" | "unlocked";

export function AdminGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>("checking");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const session = readAdminSession();

    if (!session) {
      setState("locked");
      return;
    }

    verifyGithubAdminToken(session.token)
      .then((verified) => {
        if (!active) return;
        saveAdminSession(verified);
        setState("unlocked");
      })
      .catch(() => {
        if (!active) return;
        setState("locked");
      });

    return () => {
      active = false;
    };
  }, []);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const session = await verifyGithubAdminToken(token);
      saveAdminSession(session);
      setToken("");
      setState("unlocked");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "unlocked") {
    return <>{children}</>;
  }

  if (state === "checking") {
    return (
      <div className="page admin-gate">
        <section className="panel admin-gate-card" aria-live="polite">
          <span className="eyebrow">Protected workspace</span>
          <h1>正在验证管理员权限</h1>
          <p>正在重新校验当前标签页中的 GitHub 会话。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page admin-gate">
      <section className="panel admin-gate-card">
        <span className="eyebrow">Protected workspace</span>
        <h1>管理员验证</h1>
        <p>
          此入口仅向拥有本仓库写入权限的 GitHub 账号开放。令牌只保存在当前标签页会话中，
          关闭标签页后自动清除。
        </p>
        <form onSubmit={unlock}>
          <label>
            <span>GitHub Personal Access Token</span>
            <input
              type="password"
              value={token}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setToken(event.target.value);
                setError("");
              }}
              placeholder="github_pat_..."
            />
          </label>
          <button
            type="submit"
            className="button button-primary"
            disabled={submitting}
          >
            {submitting ? "正在校验…" : "验证并进入"}
          </button>
        </form>
        {error && (
          <p className="admin-gate-error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <span>需要仓库 Contents 读写权限。</span>
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noreferrer noopener"
          >
            创建 Fine-grained token ↗
          </a>
        </footer>
      </section>
    </div>
  );
}
