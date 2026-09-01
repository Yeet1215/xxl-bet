CREATE TABLE "bets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"bet_minutes" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"score" smallint,
	"diff_minutes" smallint,
	"is_closest" boolean,
	"is_exact" boolean
);
--> statement-breakpoint
CREATE TABLE "board_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"invite_code" text NOT NULL,
	"lock_time_minutes" smallint DEFAULT 540 NOT NULL,
	"window_minutes" smallint DEFAULT 60 NOT NULL,
	"max_points" smallint DEFAULT 100 NOT NULL,
	"exact_multiplier" smallint DEFAULT 2 NOT NULL,
	"timezone" text DEFAULT 'Europe/Amsterdam' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boards_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "decide_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"proposed_outcome_minutes" smallint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_id" uuid
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"round_date" date NOT NULL,
	"outcome_minutes" smallint,
	"decided_at" timestamp with time zone,
	"decided_by_id" uuid
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decide_requests" ADD CONSTRAINT "decide_requests_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decide_requests" ADD CONSTRAINT "decide_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decide_requests" ADD CONSTRAINT "decide_requests_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_decided_by_id_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bets_round_user_idx" ON "bets" USING btree ("round_id","user_id");--> statement-breakpoint
CREATE INDEX "bets_user_idx" ON "bets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "board_members_board_user_idx" ON "board_members" USING btree ("board_id","user_id");--> statement-breakpoint
CREATE INDEX "board_members_user_idx" ON "board_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "boards_owner_idx" ON "boards" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "decide_requests_round_idx" ON "decide_requests" USING btree ("round_id");--> statement-breakpoint
CREATE UNIQUE INDEX "decide_requests_pending_idx" ON "decide_requests" USING btree ("round_id","requester_id") WHERE "decide_requests"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "rounds_board_date_idx" ON "rounds" USING btree ("board_id","round_date");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_lower_idx" ON "users" USING btree (lower("username"));