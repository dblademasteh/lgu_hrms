// Open an authenticated HTML response (payslip print etc.) in a new tab.
//
// A top-level `window.open(apiUrl)` can't carry the `Authorization: Bearer`
// header, and requireAuth only reads that header — so navigation always 401s.
// Instead we fetch through the axios client (token attached), then open the
// HTML from a `blob:` URL (same-origin-free, keeps `noopener` security).
export async function openHtmlInNewTab(promise) {
  const res = await promise;
  const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return res;
}