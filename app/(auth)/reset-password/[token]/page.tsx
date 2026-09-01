import type { Metadata } from 'next'

import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = { title: 'Reset password — XXL Bet' }

export default async function ResetPasswordPage({
  params,
}: PageProps<'/reset-password/[token]'>) {
  const { token } = await params
  return <ResetPasswordForm token={token} />
}
