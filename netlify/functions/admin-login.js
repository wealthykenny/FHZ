import jwt from 'jsonwebtoken';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const { username, password } = JSON.parse(event.body || '{}');
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
  }

  const token = jwt.sign({ role: 'admin', username }, process.env.ADMIN_SESSION_SECRET, { expiresIn: '8h' });
  return { statusCode: 200, body: JSON.stringify({ token }) };
};
