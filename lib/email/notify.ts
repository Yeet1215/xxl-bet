import 'server-only'
import { and, eq, isNotNull, ne } from 'drizzle-orm'

import { db } from '@/lib/db'
import { boardMembers, users, type Board } from '@/lib/db/schema'
import { getRoundWithBets } from '@/lib/queries/rounds'
import { sendEmail } from '@/lib/email/client'
import { roundDecidedEmailHtml } from '@/lib/email/templates/round-decided'
import { formatBetValue, formatRoundDate } from '@/lib/utils/format'

/**
 * Best-effort decided-round notification: ONE email, opted-in members in BCC
 * (single SMTP call, addresses private), decider excluded. Never throws —
 * a mail hiccup must not break deciding. Await it (serverless drops detached
 * promises) AFTER the decide transaction commits.
 */
export async function sendRoundDecidedEmails(
  board: Board,
  roundDate: string,
  deciderId: string,
): Promise<void> {
  try {
    const recipients = await db
      .select({ email: users.email })
      .from(boardMembers)
      .innerJoin(users, eq(boardMembers.userId, users.id))
      .where(
        and(
          eq(boardMembers.boardId, board.id),
          eq(users.notifyOnDecide, true),
          isNotNull(users.email),
          ne(users.id, deciderId),
        ),
      )
    const bcc = recipients.map((r) => r.email as string)
    if (bcc.length === 0) return

    const { round, bets } = await getRoundWithBets(board.id, roundDate)
    if (!round || round.outcomeValue === null) return

    const outcomeText = formatBetValue(round.outcomeValue, board.betType, board.unitLabel)
    const winners = bets.filter((bet) => bet.isClosest)
    const winnersText =
      winners.length === 0
        ? 'Nobody bet this round.'
        : `${winners.map((w) => w.displayName).join(' & ')} ${
            winners.length === 1 ? 'takes' : 'take'
          } the round with +${winners[0].score ?? 0} points.`

    const base = process.env.APP_URL ?? 'http://localhost:3000'
    const { error } = await sendEmail(
      // BCC-only mail still needs a To header Gmail accepts — send it to self.
      process.env.GMAIL_USER ?? bcc[0],
      `${board.name}: decided — ${outcomeText}`,
      roundDecidedEmailHtml({
        boardName: board.name,
        roundLabel: formatRoundDate(roundDate),
        outcomeText,
        winnersText,
        boardLink: `${base}/board/${board.id}`,
      }),
      { bcc },
    )
    if (error) console.error('[sendRoundDecidedEmails] send failed:', error)
  } catch (err) {
    console.error('[sendRoundDecidedEmails]', err instanceof Error ? err.message : err)
  }
}
