import { initSchema, pool } from './utils/db.js';

export default async (req) => {
  await initSchema();

  if (req.httpMethod === 'GET') {
    const rows = await pool.query('SELECT * FROM drafts WHERE posted = FALSE ORDER BY created_at DESC LIMIT 50');
    return { statusCode: 200, body: JSON.stringify({ drafts: rows.rows }) };
  }

  if (req.httpMethod === 'POST') {
    const { prompt, model, ratio, imageUrl } = JSON.parse(req.body || '{}');
    const result = await pool.query(
      'INSERT INTO drafts(prompt, model, ratio, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [prompt, model, ratio, imageUrl],
    );
    return { statusCode: 200, body: JSON.stringify(result.rows[0]) };
  }

  if (req.httpMethod === 'DELETE') {
    const id = req.queryStringParameters?.id;
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'id required' }) };
    await pool.query('DELETE FROM drafts WHERE id = $1 AND posted = FALSE', [id]);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
