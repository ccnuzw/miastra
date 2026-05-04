import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { createDatabasePool, loadScriptEnv } from './db-utils'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'

loadScriptEnv()

export async function seedDatabase() {
  const pool = createDatabasePool('数据库种子数据初始化')
  try {
    const now = new Date().toISOString()
    const adminId = randomUUID()
    const userId = randomUUID()
    const adminPasswordHash = await bcrypt.hash('admin123', 10)
    const demoPasswordHash = await bcrypt.hash('secret123', 10)

    const templateId1 = randomUUID()
    const templateId2 = randomUUID()
    const workId1 = randomUUID()
    const workId2 = randomUUID()
    const batchId1 = randomUUID()
    const batchId2 = randomUUID()
    const taskId1 = randomUUID()
    const taskId2 = randomUUID()
    const auditId = randomUUID()
    const auditId2 = randomUUID()
    const quotaId = randomUUID()

    await pool.query('BEGIN')
    await pool.query('TRUNCATE TABLE audit_logs, generation_tasks, provider_configs, sessions, prompt_templates, works, draw_batches, quota_profiles, users RESTART IDENTITY CASCADE')

    await pool.query(
      `INSERT INTO users (id, email, nickname, role, password_hash, password_reset_token, password_reset_expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NULL, NULL, $6, $7)`,
      [adminId, 'admin@miastra.local', 'admin', 'admin', adminPasswordHash, now, now],
    )

    await pool.query(
      `INSERT INTO users (id, email, nickname, role, password_hash, password_reset_token, password_reset_expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NULL, NULL, $6, $7)`,
      [userId, 'demo@miastra.local', 'Demo Creator', 'user', demoPasswordHash, now, now],
    )

    await pool.query(
      `INSERT INTO provider_configs (user_id, provider_id, api_url, model, api_key, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'openai', 'https://api.openai.com', 'gpt-image-1', 'demo-key-local', now],
    )

    await pool.query(
      `INSERT INTO prompt_templates (id, user_id, title, name, content, category, tags_json, created_at, updated_at, last_used_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10),
              ($11, $2, $12, $13, $14, $15, $16::jsonb, $8, $9, $17)`,
      [
        templateId1, userId, '产品海报模板', '产品海报模板', 'minimal luxury product poster, studio lighting, clean background', '海报', JSON.stringify(['产品', '营销']),
        now, now, now,
        templateId2, '角色设定模板', '角色设定模板', 'cinematic character portrait, dramatic rim light, ultra detailed', '角色', JSON.stringify(['设定', '人物']), now, now, now,
      ],
    )

    await pool.query(
      `INSERT INTO works (id, user_id, title, src, meta, variation, batch_id, draw_index, task_status, error, retryable, retry_count, created_at, mode, provider_model, size, quality, snapshot_id, generation_snapshot_json, prompt_snippet, prompt_text, is_favorite, favorite, tags_json)
       VALUES
       ($1, $2, $3, $4, $5, NULL, $6, 1, 'success', NULL, false, 0, $7, 'text2image', 'gpt-image-1', '1024x1024', 'high', $8, $9::jsonb, $10, $11, true, true, $12::jsonb),
       ($13, $2, $14, $15, $16, NULL, $17, 2, 'success', NULL, false, 0, $18, 'text2image', 'gpt-image-1', '1024x1024', 'high', $19, $20::jsonb, $21, $22, false, false, $23::jsonb)`,
      [
        workId1,
        userId,
        '香水海报 Demo',
        'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80',
        '文生图 · gpt-image-1 · 1024x1024 · high',
        batchId1,
        Date.now(),
        randomUUID(),
        JSON.stringify({ mode: 'text2image', note: 'seed work 1' }),
        'luxury perfume poster',
        'luxury perfume poster, minimal premium style',
        JSON.stringify(['poster', 'luxury']),
        workId2,
        '角色立绘 Demo',
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
        '文生图 · gpt-image-1 · 1024x1024 · high',
        batchId2,
        Date.now() - 1000,
        randomUUID(),
        JSON.stringify({ mode: 'text2image', note: 'seed work 2' }),
        'cinematic heroine portrait',
        'cinematic heroine portrait, fantasy costume, detailed face',
        JSON.stringify(['character', 'portrait']),
      ],
    )

    await pool.query(
      `INSERT INTO draw_batches (id, user_id, title, created_at, strategy, concurrency, count, success_count, failed_count, snapshot_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10),
              ($11, $2, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        batchId1, userId, '香水海报批次', Date.now(), 'linear', 1, 2, 2, 0, randomUUID(),
        batchId2, '角色立绘批次', Date.now() - 1000, 'smart', 2, 2, 1, 1, randomUUID(),
      ],
    )

    await pool.query(
      `INSERT INTO generation_tasks (id, user_id, status, progress, error_message, payload_json, result_json, created_at, updated_at)
       VALUES
       ($1, $2, 'succeeded', 100, NULL, $3::jsonb, $4::jsonb, $5, $6),
       ($7, $2, 'failed', 100, 'Seed failure example', $8::jsonb, NULL, $9, $10)`,
      [
        taskId1,
        userId,
        JSON.stringify({
          mode: 'text2image',
          title: '香水海报任务',
          meta: '文生图 · gpt-image-1 · 1024x1024 · high',
          promptText: 'luxury perfume poster',
          workspacePrompt: 'luxury perfume poster',
          requestPrompt: 'luxury perfume poster, minimal premium style',
          size: '1024x1024',
          quality: 'high',
          model: 'gpt-image-1',
          providerId: 'openai',
          stream: false,
        }),
        JSON.stringify({
          imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80',
          title: '香水海报任务',
          meta: '文生图 · gpt-image-1 · 1024x1024 · high',
          promptText: 'luxury perfume poster, minimal premium style',
          promptSnippet: 'luxury perfume poster',
          size: '1024x1024',
          quality: 'high',
          providerModel: 'gpt-image-1',
          snapshotId: randomUUID(),
          mode: 'text2image',
          generationSnapshot: { seed: true },
        }),
        now,
        now,
        taskId2,
        JSON.stringify({
          mode: 'text2image',
          title: '失败示例任务',
          meta: '文生图 · gpt-image-1 · 1024x1024 · high',
          promptText: 'broken prompt',
          workspacePrompt: 'broken prompt',
          requestPrompt: 'broken prompt',
          size: '1024x1024',
          quality: 'high',
          model: 'gpt-image-1',
          providerId: 'openai',
          stream: false,
        }),
        now,
        now,
      ],
    )

    await pool.query(
      `INSERT INTO audit_logs (id, actor_user_id, actor_role, action, target_type, target_id, payload_json, ip, created_at)
       VALUES
       ($1, $2, 'admin', 'seed.complete', 'system', 'seed', $3::jsonb, '127.0.0.1', $4),
       ($5, $2, 'admin', 'user.role.updated', 'user', $2, $6::jsonb, '127.0.0.1', $7)`,
      [auditId, adminId, JSON.stringify({ note: 'seed data prepared' }), now, auditId2, JSON.stringify({ role: 'admin' }), now],
    )

    await pool.query(
      `INSERT INTO quota_profiles (user_id, plan_name, quota_total, quota_used, quota_remaining, renews_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, 'Starter', 1000, 120, 880, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), now],
    )

    await pool.query('COMMIT')
    console.log('Database seed completed.')
    console.log('Admin: admin / admin123')
    console.log('User: demo@miastra.local / secret123')
  } catch (error) {
    await pool.query('ROLLBACK')
    throw error
  } finally {
    await pool.end()
  }
}

async function main() {
  await seedDatabase()
}

if (process.argv[1]?.endsWith('db-seed.ts')) {
  void main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
