import Link from 'next/link'
import React from 'react'

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <section className="w-full max-w-2xl">
          <Link href="/" className="mb-5 block font-title text-center text-3xl font-bold text-primary">
            ONETTO
          </Link>

          <div className="rounded-lg bg-white p-6 sm:p-8">
            <div className="mb-8">
              <h1 className="font-title text-3xl font-semibold text-zinc-800">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{subtitle}</p>
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  )
}

export default AuthShell
