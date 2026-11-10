import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

const links = [
  ["/", "总览"],
  ["/changes", "变更雷达"],
  ["/standards", "标准库"],
  ["/reports", "审核稿"],
  ["/about", "方法与说明"],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到正文
      </a>
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="brand-copy">
            <span className="brand-title">SeatScope</span>
            <span className="brand-subtitle">
              M1 座椅法规雷达 · 锁老师
            </span>
          </span>
        </Link>
        <nav className="site-nav" aria-label="主导航">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <span>SeatScope · M1 座椅法规雷达 · 锁老师</span>
        <span>AI 辅助分析，须经人工复核</span>
      </footer>
    </div>
  );
}
