import Link from "next/link";
import React from "react";
import AuthBrand from "./AuthBrand";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  appearance?: "default" | "modern";
}

function AuthShell({ title, subtitle, children, appearance = "default" }: AuthShellProps) {
  const modern = appearance === "modern";
  return (
    <main
      className={modern ? "min-h-dvh bg-ui-background px-4 py-10 sm:px-6" : "min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8"}
      style={modern ? { backgroundImage: "radial-gradient(circle at 50% 42%, var(--onetto-surface) 0%, var(--onetto-background) 72%, var(--onetto-primary-soft) 160%)" } : undefined}
    >
      <div className={modern ? "mx-auto flex min-h-[calc(100dvh-5rem)] w-full items-center justify-center" : "mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center"}>
        <section className={modern ? "w-full max-w-xl" : "w-full max-w-2xl"}>
          {modern ? <AuthBrand /> : <Link href="/" className="mb-5 block font-title text-center text-3xl font-bold text-primary">ONETTO</Link>}

          <div className={modern ? "rounded-ui-card border border-ui-border bg-ui-surface p-6 shadow-ui-popover sm:p-8" : "rounded-lg bg-white p-6 sm:p-8"}>
            <div className={modern ? "mb-6" : "mb-8"}>
              <h1 className={modern ? "font-title text-3xl font-semibold tracking-tight text-ui-text" : "font-title text-3xl font-semibold text-zinc-800"}>
                {title}
              </h1>
              <p className={modern ? "mt-1.5 text-sm leading-6 text-ui-secondary" : "mt-2 text-sm leading-6 text-zinc-500"}>{subtitle}</p>
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export default AuthShell;
