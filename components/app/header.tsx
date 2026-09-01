import Link from 'next/link'

import { logoutUser } from '@/lib/actions/auth'
import type { User } from '@/lib/db/schema'

// Sticky top header (DESIGN.md): wordmark left, nav + logout right. Server
// component — receives the already-resolved user from the (app) layout.
export function Header({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-40 bg-bg border-b border-border">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-accent">
          XXL Bet
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold">
          <Link
            href="/"
            className="px-3 py-2 rounded-[10px] text-text-secondary hover:text-text-primary hover:bg-surface-1 transition-colors"
          >
            Boards
          </Link>
          <Link
            href="/profile"
            className="px-3 py-2 rounded-[10px] text-text-secondary hover:text-text-primary hover:bg-surface-1 transition-colors max-w-[16ch] truncate"
          >
            {user.displayName}
          </Link>
          <form action={logoutUser}>
            <button
              type="submit"
              className="px-3 py-2 rounded-[10px] text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors cursor-pointer"
            >
              Log out
            </button>
          </form>
        </nav>
      </div>
    </header>
  )
}
