import React, { useEffect, useMemo, useState } from 'react';

const models = [
  { key: 'fazon-realistic-pro', label: 'Fazon Realistic Pro', acceptsImage: true },
  { key: 'fazon-photography', label: 'Fazon Photography', acceptsImage: false },
  { key: 'nano-banana-pro', label: 'Nano Banana Pro', acceptsImage: true },
];

const aspectRatios = ['1:1', '2:3', '4:5', '9:16', '16:9'];

function LoadingRobot() {
  return (
    <div className="robot-wrap" aria-label="loading">
      <svg width="190" height="120" viewBox="0 0 190 120" role="img" aria-label="Robot walking">
        <rect x="24" y="35" width="60" height="45" rx="10" className="robot-body" />
        <rect x="35" y="20" width="38" height="24" rx="8" className="robot-head" />
        <circle cx="47" cy="32" r="4" className="robot-eye" />
        <circle cx="62" cy="32" r="4" className="robot-eye" />
        <line x1="85" y1="52" x2="107" y2="45" className="robot-arm" />
        <line x1="37" y1="82" x2="28" y2="106" className="robot-leg left" />
        <line x1="72" y1="82" x2="82" y2="106" className="robot-leg right" />
      </svg>
      <p>Robot is walking your prompt to the model...</p>
    </div>
  );
}

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(models[0].key);
  const [ratio, setRatio] = useState(aspectRatios[0]);
  const [referenceFile, setReferenceFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [status, setStatus] = useState('');

  const selectedModel = useMemo(() => models.find((m) => m.key === model), [model]);

  const refreshDrafts = async () => {
    const res = await fetch('/.netlify/functions/drafts');
    if (res.ok) {
      const payload = await res.json();
      setDrafts(payload.drafts ?? []);
    }
  };

  useEffect(() => {
    refreshDrafts().catch(() => setStatus('Draft sync unavailable until backend secrets are set.'));
  }, []);

  const generate = async () => {
    setLoading(true);
    setStatus('');
    try {
      const referenceImageBase64 = referenceFile
        ? await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(referenceFile);
          })
        : '';
      const res = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, ratio, referenceImageBase64 }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Generation failed');
      setImageUrl(payload.imageUrl);
      setStatus(`Generated using key slot ${payload.keySlot}`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!imageUrl) return;
    const res = await fetch('/.netlify/functions/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, prompt, model, ratio }),
    });
    if (res.ok) {
      setStatus('Draft temporarily saved.');
      refreshDrafts();
    }
  };

  const saveToProfile = async (id) => {
    const res = await fetch('/.netlify/functions/drafts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setStatus('Saved to account profile.');
      refreshDrafts();
    }
  };

  const deleteDraft = async (id) => {
    await fetch(`/.netlify/functions/drafts?id=${id}`, { method: 'DELETE' });
    refreshDrafts();
  };

  const saveToDevice = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `flex4genz-${Date.now()}.png`;
    link.click();
  };

  return (
    <main className="app-shell">
      <section className="glass hero">
        <h1>Flex4Genz</h1>
        <p>Image studio with bold visible text, thick liquid-glass cards, and orange-white clarity.</p>
      </section>

      <section className="grid-layout">
        <article className="glass panel">
          <h2>Create</h2>
          <label htmlFor="prompt">Prompt text</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type what you want to generate"
          />

          <label htmlFor="model">Model</label>
          <select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>

          <label>Aspect ratio</label>
          <div className="ratio-row">
            {aspectRatios.map((r) => (
              <button type="button" key={r} className={`pill ${ratio === r ? 'active' : ''}`} onClick={() => setRatio(r)}>
                {r}
              </button>
            ))}
          </div>

          {selectedModel?.acceptsImage && (
            <>
              <label htmlFor="reference">Reference image input (optional)</label>
              <input id="reference" type="file" accept="image/*" onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)} />
            </>
          )}

          <button type="button" className="cta" onClick={generate} disabled={!prompt || loading}>
            Generate
          </button>
        </article>

        <article className="glass panel">
          <h2>Output</h2>
          {loading && <LoadingRobot />}
          {!loading && imageUrl && <img src={imageUrl} alt="Generated" className="output-image" />}
          {!loading && !imageUrl && <p>Generated image appears here.</p>}

          <div className="button-row">
            <button type="button" className="cta" onClick={saveDraft} disabled={!imageUrl}>
              Temporarily Save
            </button>
            <button type="button" className="cta" onClick={saveToDevice} disabled={!imageUrl}>
              Save to Device
            </button>
          </div>
          <p className="status">{status}</p>
        </article>
      </section>

      <section className="glass panel">
        <h2>Temporary Saves</h2>
        <div className="draft-grid">
          {drafts.map((d) => (
            <div className="glass draft" key={d.id}>
              <img src={d.image_url} alt={d.prompt} />
              <p>{d.prompt}</p>
              <div className="button-row">
                <button type="button" className="pill" onClick={() => saveToProfile(d.id)}>
                  Save to Account Profile
                </button>
                <button type="button" className="pill" onClick={() => deleteDraft(d.id)}>
                  Delete (if not posted)
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
