import { init } from '@langtrace-init/init'
import pgvector from 'pgvector/pg'
import pg from 'pg'

init({ write_spans_to_console: false })
export const basic = async (): Promise<void> => {
  const client = new pg.Client({
    database: 'pgvector_test',
    connectionString: 'postgres://default:WFUkM4igR1JV@ep-restless-feather-a45y06aj-pooler.us-east-1.aws.neon.tech:5432/verceldb?sslmode=require'
  })
  await client.connect()
  await client.query('CREATE EXTENSION IF NOT EXISTS vector')
  await pgvector.registerType(client)

  await client.query('DROP TABLE IF EXISTS pg_items', [])
  await client.query('CREATE TABLE pg_items (id serial PRIMARY KEY, embedding vector(3))')

  const params = [
    pgvector.toSql([1, 1, 1]),
    pgvector.toSql([2, 2, 2]),
    pgvector.toSql([1, 1, 2]),
    null
  ]
  await client.query('INSERT INTO pg_items (embedding) VALUES ($1), ($2), ($3), ($4)', params)

  const r = await client.query('SELECT * FROM pg_items ORDER BY embedding <-> $1 LIMIT 5', [pgvector.toSql([1, 1, 1])])
  console.log(r.rows)
  await client.query('CREATE INDEX ON pg_items USING hnsw (embedding vector_l2_ops)')

  await client.end()
}
