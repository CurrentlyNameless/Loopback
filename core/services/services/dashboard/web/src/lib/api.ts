export async function fetchApi<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `API request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data.error || data.message) errorMsg = data.error || data.message;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}
