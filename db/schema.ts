import { sql } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const leads = pgTable("leads", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  situation: text("situation").notNull(),
  profession: text("profession").notNull(),
  englishHistory: text("english_history").notNull().default("Não informado"),
  previousInvestment: text("previous_investment").notNull(),
  investmentBudget: text("investment_budget").notNull().default(""),
  fluencyDeadline: text("fluency_deadline").notNull(),
  status: text("status").notNull().default("complete"),
  contactStatus: text("contact_status").notNull().default(""),
  lastStep: integer("last_step").notNull().default(8),
  updateToken: text("update_token").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(""),
});
