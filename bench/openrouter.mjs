export async function generate({ slug, provider, system, user, maxTokens, temperature }, { apiKey = process.env.OPENROUTER_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');
  const body = { model: slug, messages: [], max_tokens: maxTokens };
  if (system) body.messages.push({ role: 'system', content: system });
  body.messages.push({ role: 'user', content: user });
  if (temperature !== null && temperature !== undefined) body.temperature = temperature;
  if (provider) body.provider = { order: [provider], allow_fallbacks: false };
  const res = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'HTTP-Referer': 'https://github.com/guia-matthieu/ua-agent-kit', 'X-Title': 'ua-agent-kit bench' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${await res.text()}`);
  const json = await res.json();
  // finishReason 'length' = the reply hit max_tokens: the page may be cut and must not be scored as complete.
  return { text: json.choices?.[0]?.message?.content ?? '', modelVersion: json.model ?? slug, usage: json.usage ?? null, finishReason: json.choices?.[0]?.finish_reason ?? null };
}
