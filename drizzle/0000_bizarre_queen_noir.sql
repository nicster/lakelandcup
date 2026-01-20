CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner" text NOT NULL,
	"former_name" text,
	"logo" text,
	"email" text,
	"is_commissioner" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"section" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" text NOT NULL,
	"champion_id" integer,
	"runner_up_id" integer,
	"notes" text,
	CONSTRAINT "seasons_year_unique" UNIQUE("year")
);
--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_champion_id_members_id_fk" FOREIGN KEY ("champion_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_runner_up_id_members_id_fk" FOREIGN KEY ("runner_up_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;