import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("transactions", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("wallet_id").notNullable();
    table.enum("type", ["fund", "transfer", "withdrawal"]).notNullable();
    table.decimal("amount", 15, 2).notNullable();
    table.string("reference", 100).notNullable().unique();
    table.uuid("receiver_wallet_id").nullable();
    table
      .enum("status", ["pending", "completed", "failed"])
      .notNullable()
      .defaultTo("completed");
    table.text("description").nullable();
    table.timestamps(true, true);

    table
      .foreign("wallet_id")
      .references("id")
      .inTable("wallets")
      .onDelete("CASCADE");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("transactions");
}
