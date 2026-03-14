import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalToPost",
  description: "Telegram-first AI content agent for one user.",
};

const navItems: Array<{ href: string; label: string }> = [
  { href: "/", label: "Overview" },
  { href: "/ideas", label: "Ideas" },
  { href: "/drafts", label: "Drafts" },
  { href: "/jobs", label: "Jobs" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <div className="frame">
            <header className="topbar">
              <div className="brand">
                <span className="brand-tag">Telegram First Content Agent</span>
                <h1 className="brand-title">SignalToPost</h1>
                <p className="brand-copy">
                  Lean personal workflow for turning Telegram ideas into post-ready
                  X and LinkedIn drafts.
                </p>
              </div>
              <nav className="nav" aria-label="Primary navigation">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </header>
            <main className="main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
