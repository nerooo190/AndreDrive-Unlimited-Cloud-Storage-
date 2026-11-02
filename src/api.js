export async function api(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung und versuche es erneut.');
  }
  if (response.status === 204) return null;
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { /* Static hosts often return HTML for missing API routes. */ }
  if (data === undefined) {
    if (response.status >= 500) {
      throw new Error('Der Kontodienst ist momentan nicht erreichbar. Bitte versuche es später erneut.');
    }
    throw new Error('Auf diesem Server ist die Konto-API nicht eingerichtet. Registrierung und Anmeldung benötigen das AndreDrive-Backend.');
  }
  if (!response.ok) throw new Error(data?.error || `Die Anfrage ist fehlgeschlagen (HTTP ${response.status}).`);
  return data;
}
