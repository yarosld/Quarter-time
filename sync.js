// Sync: OAuth PKCE, Calendar API, conflict resolution
const CLIENT_ID = 'YOUR_CLIENT_ID'; // Замініть на реальний з Google Console
const REDIRECT_URI = window.location.origin;

export async function loginWithGoogle() {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await sha256(codeVerifier);
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=openid%20email%20profile%20https://www.googleapis.com/auth/calendar.events&code_challenge=${codeChallenge}&code_challenge_method=S256&access_type=online`;
  window.location.href = url;

  // On redirect back, extract code from URL
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${CLIENT_ID}&code=${code}&code_verifier=${codeVerifier}&grant_type=authorization_code&redirect_uri=${REDIRECT_URI}`
    });
    const tokens = await tokenResponse.json();
    sessionStorage.setItem('access_token', tokens.access_token);
    // Get or create calendar
    const calendarId = await getOrCreateCalendar(tokens.access_token);
    // Збережіть в settings
  }
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function getOrCreateCalendar(accessToken) {
  // GET calendarList.list, find 'Fractal Planner'
  // If not, POST /calendars {summary: 'Fractal Planner'}
  // Return id
  // Реалізуйте з fetch
}

export async function syncTaskToGCal(op) {
  const accessToken = sessionStorage.getItem('access_token');
  if (!accessToken) return; // Re-login
  const calendarId = 'primary'; // Замініть на settings.calendarId
  const { opType, taskId, payload } = op;
  if (opType === 'CREATE') {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: payload.title,
        description: payload.description,
        start: { dateTime: payload.start },
        end: { dateTime: payload.end }
      })
    });
    const data = await response.json();
    // Update task.synced.gcalEventId = data.id
  } // Similar for UPDATE (PATCH), DELETE
  // Handle conflicts: compare lastModified, show modal if differ
}

// ... Conflict modal UI/logic