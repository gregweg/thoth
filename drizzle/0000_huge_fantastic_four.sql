CREATE TYPE "public"."checkpoint" AS ENUM('entry', 'eod', 'follow_up', 'manual');--> statement-breakpoint
CREATE TYPE "public"."group_type" AS ENUM('hedge', 'roll', 'scale_in', 'pairs', 'manual_bundle');--> statement-breakpoint
CREATE TYPE "public"."play_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."progress_status" AS ENUM('locked', 'unlocked', 'completed');--> statement-breakpoint
CREATE TYPE "public"."side" AS ENUM('buy', 'sell', 'sell_short', 'buy_to_cover');--> statement-breakpoint
CREATE TYPE "public"."strategy_type" AS ENUM('long_equity', 'short_equity', 'covered_call', 'cash_secured_put', 'long_call', 'long_put', 'vertical_spread', 'straddle', 'strangle', 'iron_condor', 'long_future', 'short_future', 'pairs_trade');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('equity', 'option', 'future', 'crypto', 'etf');--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"vehicle_type" "vehicle_type" NOT NULL,
	"underlying_symbol" text,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "play_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"group_type" "group_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategy_type" "strategy_type" NOT NULL,
	"entry_date" date NOT NULL,
	"thesis" text,
	"status" "play_status" DEFAULT 'open' NOT NULL,
	"group_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"play_id" uuid,
	"captured_at" timestamp with time zone NOT NULL,
	"price" numeric(18, 8) NOT NULL,
	"checkpoint" "checkpoint" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_progress" (
	"strategy_type" "strategy_type" PRIMARY KEY NOT NULL,
	"status" "progress_status" DEFAULT 'locked' NOT NULL,
	"completed_play_id" uuid,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"play_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"side" "side" NOT NULL,
	"quantity" numeric(18, 8) NOT NULL,
	"price" numeric(18, 8) NOT NULL,
	"fees" numeric(18, 8),
	"executed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_group_id_play_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."play_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_progress" ADD CONSTRAINT "strategy_progress_completed_play_id_plays_id_fk" FOREIGN KEY ("completed_play_id") REFERENCES "public"."plays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "instruments_symbol_idx" ON "instruments" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "plays_entry_date_idx" ON "plays" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "price_snapshots_instrument_checkpoint_idx" ON "price_snapshots" USING btree ("instrument_id","checkpoint");--> statement-breakpoint
CREATE INDEX "price_snapshots_play_id_idx" ON "price_snapshots" USING btree ("play_id");--> statement-breakpoint
CREATE INDEX "transactions_play_id_idx" ON "transactions" USING btree ("play_id");