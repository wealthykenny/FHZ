import { pool } from './db.js';

const modelKeySlots = {
  'fazon-realistic-pro': [1, 2, 3],
  'fazon-photography': [4, 5],
  'nano-banana-pro': [6, 7],
};

const systemPrompts = {
  'fazon-realistic-pro':
    'You are a super-realistic image engine. Use Nano Banana 2 style fidelity and produce extremely realistic details, skin textures, physically plausible lighting, and natural lens behavior. Supports text and reference image guidance.',
  'fazon-photography':
    'Optimize for aesthetic photography. Prioritize composition, exposure balance, cinematic color science, and clean artistic framing. Text-only generation.',
  'nano-banana-pro':
    'General-purpose image generator with strong image edit and image input support. Preserve subject intent while improving clarity and style.',
};

export function getSystemPrompt(model) {
  return systemPrompts[model] ?? 'Generate a high quality image.';
}

export function getGeminiApiKeyBySlot(slot) {
  return process.env[`GEMINI_KEY_${slot}`] || '';
}

export async function pickKeySlot(model) {
  const slots = modelKeySlots[model] || [8, 9];

  await pool.query('BEGIN');
  try {
    for (const slot of slots) {
      await pool.query(
        'INSERT INTO gemini_key_usage(model, key_slot, usage_count) VALUES ($1, $2, 0) ON CONFLICT(model, key_slot) DO NOTHING',
        [model, slot],
      );
    }

    let result = await pool.query(
      `SELECT key_slot, usage_count FROM gemini_key_usage
       WHERE model = $1 AND key_slot = ANY($2::int[])
       ORDER BY usage_count ASC, key_slot ASC LIMIT 1`,
      [model, slots],
    );

    if (result.rows[0]?.usage_count >= 100) {
      await pool.query('UPDATE gemini_key_usage SET usage_count = 0 WHERE model = $1 AND key_slot = ANY($2::int[])', [model, slots]);
      result = await pool.query(
        `SELECT key_slot, usage_count FROM gemini_key_usage
         WHERE model = $1 AND key_slot = ANY($2::int[])
         ORDER BY usage_count ASC, key_slot ASC LIMIT 1`,
        [model, slots],
      );
    }

    const keySlot = result.rows[0].key_slot;
    await pool.query('UPDATE gemini_key_usage SET usage_count = usage_count + 1 WHERE model = $1 AND key_slot = $2', [model, keySlot]);
    await pool.query('COMMIT');
    return keySlot;
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}
