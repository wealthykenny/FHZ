import { initSchema } from './utils/db.js';
import { getGeminiApiKeyBySlot, getSystemPrompt, pickKeySlot } from './utils/geminiKeys.js';

const modelMap = {
  'fazon-realistic-pro': 'gemini-2.5-flash-image-preview',
  'fazon-photography': 'gemini-2.5-flash-image-preview',
  'nano-banana-pro': 'gemini-2.5-flash-image-preview',
};

export default async (req) => {
  if (req.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    await initSchema();
    const { prompt, model, ratio, referenceImageBase64 } = JSON.parse(req.body || '{}');
    if (!prompt || !model || !ratio) {
      return { statusCode: 400, body: JSON.stringify({ error: 'prompt, model, ratio are required' }) };
    }

    const keySlot = await pickKeySlot(model);
    const apiKey = getGeminiApiKeyBySlot(keySlot);
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: `Missing GEMINI_KEY_${keySlot} secret` }) };
    }

    const contents = [{ role: 'user', parts: [{ text: `${getSystemPrompt(model)}\n\nPrompt: ${prompt}\nAspect ratio: ${ratio}` }] }];

    if (referenceImageBase64) {
      contents[0].parts.push({ inline_data: { mime_type: 'image/png', data: referenceImageBase64 } });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelMap[model]}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      },
    );
    const payload = await response.json();
    const imagePart = payload?.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);

    if (!imagePart) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Gemini did not return image data.', detail: payload }) };
    }

    const filename = `generated/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    return {
      statusCode: 200,
      body: JSON.stringify({ imageUrl: `data:image/png;base64,${imagePart.inlineData.data}`, blobKey: filename, keySlot }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
