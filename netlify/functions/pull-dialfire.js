const axios = require('axios');

exports.handler = async (event, context) => {
  const token = process.env.DIALFIRE_KEY_CLIENTHUB_MASTER;
  const campaignId = 'N4UMU8GPQKZMRM93';

  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing API key' }) };
  }

  try {
    let allCalls = [];
    let page = 1;
    const lastPullDate = process.env.LAST_PULL_DATE || '2025-10-01T00:00:00Z';

    while (true) {
      const response = await axios.get(
        `https://app.dialfire.com/api/campaigns/${campaignId}/connections`,
        {
          params: { page, per_page: 100, since: lastPullDate },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const items = response.data.items || [];
      if (!items.length) break;
      allCalls = allCalls.concat(items);
      if (items.length < 100) break;
      page++;
    }

    // === MERGE WITH EXISTING DATA (CSV or previous sync) ===
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

    const newPullDate = new Date().toISOString().split('T')[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        processedData,
        newPullDate,
        totalCalls: allCalls.length,
        lastSync: new Date().toISOString(),
        source: 'dialfire'
      })
    };

  } catch (error) {
    console.error('Dialfire sync failed:', error.response?.data || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to sync with Dialfire', 
        details: error.message 
      })
    };
  }
};
