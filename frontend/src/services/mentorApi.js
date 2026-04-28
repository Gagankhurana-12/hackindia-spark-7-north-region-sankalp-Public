function getChildToken() {
  return localStorage.getItem('childToken') || '';
}

async function request(path, options = {}) {
  const token = getChildToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || `Request failed (${response.status})`);
  }
  return payload;
}

export async function getMentorHistory({ mode = 'general', videoId = '', limit = 5 } = {}) {
  const params = new URLSearchParams({ mode, limit: String(limit) });
  if (videoId) params.set('videoId', videoId);
  return request(`/api/mentor/history?${params.toString()}`, { method: 'GET' });
}

export async function resetMentorHistory({ mode = 'general', videoId = '' } = {}) {
  return request('/api/mentor/history/reset', {
    method: 'POST',
    body: JSON.stringify({ mode, videoId }),
  });
}

export async function sendMentorText({
  message,
  mode = 'general',
  videoId = '',
  language = 'en',
  withVoice = true,
  autoPlay = true,
  learningSignal = null,
}) {
  return request('/api/mentor/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      mode,
      videoId,
      language,
      learningSignal,
      voice: {
        enabled: withVoice,
        autoPlay,
      },
    }),
  });
}

export async function createVoiceSession({ mode = 'general', videoId = '' } = {}) {
  const params = new URLSearchParams({ mode });
  if (videoId) params.set('videoId', videoId);
  return request(`/api/mentor/session?${params.toString()}`, { method: 'GET' });
}

export async function saveVoiceTranscript({ transcript, mode = 'general', videoId = '' }) {
  return request('/api/mentor/session/save', {
    method: 'POST',
    body: JSON.stringify({ transcript, mode, videoId }),
  });
}
