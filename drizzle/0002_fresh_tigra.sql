ALTER TABLE "bets" DROP COLUMN "bet_minutes";--> statement-breakpoint
ALTER TABLE "boards" DROP COLUMN "window_minutes";--> statement-breakpoint
ALTER TABLE "decide_requests" DROP COLUMN "proposed_outcome_minutes";--> statement-breakpoint
ALTER TABLE "rounds" DROP COLUMN "outcome_minutes";