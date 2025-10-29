// netlify/functions/sync-test.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow GET for testing
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_URL = 'https://YOUR-SITE.netlify.app/.netlify/identity'; // ← CHANGE THIS
  const TOKEN = process.env.DIALFIRE_KEY_NO_ANSWER;

  try {
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) throw new Error(`GoTrue error: ${res.status}`);

    const users = await res.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Sync client working! 🎉',
        userCount: users.length,
        users: users.map(u => ({ id: u.id, email: u.email, role: u.role }))
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
