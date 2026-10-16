// Sandbox self-test (a QRG game). Paste it into the code editor and press Play.
//
// It checks whether the game can REACH things it must not reach. It only tests whether an access is
// possible - it never reads a value and nothing is collected or sent anywhere. The result is shown on the
// screen (green = blocked, red = reachable) and posted to the page as plain true/false for the test suite.
//
// Normal play (sandboxed iframe): every line must be BLOCKED.
// "Run without protection" mode: cookies, storage and the parent page become REACHABLE - this is the risk
// the sandbox exists to remove.
const T = [
  ['COOKIES', () => { document.cookie; }],
  ['LOCAL STORAGE', () => { localStorage.length; }],
  ['PARENT PAGE', () => { parent.document.title; }],
  ['TOP WINDOW', () => { top.location.href; }],
  ['OPEN A POPUP', () => { const w = window.open('about:blank'); if (!w) throw 0; w.close(); }]
];
let net = 'WAITING', violations = 0;
try { document.addEventListener('securitypolicyviolation', () => { violations++; }); } catch (e) { /* no document */ }
try {
  // a reserved .invalid address: no request can ever reach a real server
  // the policy-violation event arrives a moment after the request fails, so decide a little later
  const verdict = ok => setTimeout(() => { net = violations ? 'BLOCKED' : ok ? 'REACHABLE' : 'FAILED (NOT BY CSP)'; }, 150);
  fetch('https://probe.invalid/').then(() => verdict(true), () => verdict(false));
} catch (e) { net = 'BLOCKED'; }
const res = T.map(([n, f]) => { let ok; try { f(); ok = 'REACHABLE'; } catch (e) { ok = 'BLOCKED'; } return [n, ok]; });
let sent = 0;
return i => {
  cls(NAVY);
  tc('SANDBOX SELF-TEST', 8, WHITE, 2);
  res.concat([['NETWORK', net]]).forEach(([n, v], k) => {
    t(n, 12, 40 + k * 16, WHITE);
    t(v, 140, 40 + k * 16, v == 'BLOCKED' ? LIME : v == 'WAITING' ? YELLOW : RED);
  });
  if (!sent && net != 'WAITING') {
    sent = 1;
    try { res.concat([['NETWORK', net]]).forEach(([n, v]) => parent.postMessage({ q: 'probe', k: n, v }, '*')); } catch (e) { /* no parent */ }
  }
  tc('NOTHING IS COLLECTED OR SENT', 200, GRAY);
};
