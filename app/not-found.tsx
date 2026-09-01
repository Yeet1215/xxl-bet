import { ButtonLink } from '@/components/ui/button-link'

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <p className="font-mono text-5xl font-bold text-accent">404</p>
        <h1 className="text-xl font-extrabold tracking-tight mt-3">Nothing to bet on here.</h1>
        <p className="text-sm text-text-secondary mt-1">
          This page doesn&apos;t exist — or it&apos;s a board you&apos;re not part of.
        </p>
      </div>
      <ButtonLink href="/">Back to your boards</ButtonLink>
    </div>
  )
}
