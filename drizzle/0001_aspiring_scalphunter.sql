ALTER TABLE "bets" ADD COLUMN "bet_value" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "bet_type" text DEFAULT 'time' NOT NULL;--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "unit_label" text;--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "window_size" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "decide_requests" ADD COLUMN "proposed_outcome_value" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "outcome_value" integer;