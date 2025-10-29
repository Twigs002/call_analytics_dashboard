// netlify/functions/pull-dialfire.js
const axios = require('axios');

exports.handler = async (event, context) => {
  const token = process.env.DIALFIRE_KEY_NO_ANSWER;
  const campaignId = 'N4UMU8GPQKZMRM93';

  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing API key' }) };
  }

  try {
    let allCalls = [];
    let page = 1;
    const since = '2025-10-28T00:00:00Z';  // FIXED: Only pull from Oct 28

    while (true) {
      const response = await axios.get(
        `https://app.dialfire.com/api/campaigns/${campaignId}/connections`,
        {
          params: { page, per_page: 100, since },
          headers: { Authorization: token },
          timeout: 15000
        }
      );

      const items = response.data.items || [];
      if (!items.length) break;
      allCalls = allCalls.concat(items);
      if (items.length < 100) break;
      page++;
    }

    let processedData = {};
    if (event.httpMethod === 'POST' && event.body) {
      try {
        const body = JSON.parse(event.body);
        Object.assign(processedData, body.existingData || {});
      } catch (e) {}
    }

    allCalls.forEach(call => {
      const caller = call.agent_name || 'Unknown';
      const period = call.created_at?.split('T')[0] || 'Unknown';
      if (!processedData[caller]) processedData[caller] = {};
      if (!processedData[caller][period]) {
        processedData[caller][period] = { calls: 0, success: 0, declines: 0 };
      }
      processedData[caller][period].calls += 1;
      if (call.status_detail === 'success') processedData[caller][period].success += 1;
      else if (call.status_detail === 'declined') processedData[caller][period].declines += 1;
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        processedData,
        totalCalls: allCalls.length,
        lastSync: new Date().toISOString(),
        source: 'dialfire',
        since: '2025-10-28'  // For debugging
      })
    };

  } catch (error) {
    console.error('Dialfire Error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        error: 'Sync failed',
        status: error.response?.status,
        details: error.response?.data || error.message
      })
    };
  }
};
