const axios = require('axios');

exports.handler = async (event, context) => {
  const token = process.env.DIALFIRE_KEY_CLIENTHUB_MASTER;
  const campaignId = 'N4UMU8GPQKZMRM93';

  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing DIALFIRE_KEY_CLIENTHUB_MASTER' }) };
  }

  try {
    let allCalls = [];
    let page = 1;
    const lastPullDate = process.env.LAST_PULL_DATE || '2025-10-01';
    while (true) {
      const response = await axios.get(`https://app.dialfire.com/api/campaigns/${campaignId}/connections?page=${page}&per_page=100&since=${lastPullDate}`, {
        headers: { Authorization: token }
      });
      console.log(`Page ${page} response:`, response.data); // Log response for debugging
      const items = response.data.items || [];
      if (!items.length) break;
      allCalls = allCalls.concat(items);
      if (items.length < 100) break;
      page++;
    }

    const processedData = {};
    allCalls.forEach(call => {
      const caller = call.agent_name || 'Unknown';
      const period = call.created_at?.split('T')[0] || 'Unknown';
      if (!processedData[caller]) processedData[caller] = {};
      if (!processedData[caller][period]) processedData[caller][period] = { calls: 0, success: 0, declines: 0 };
      processedData[caller][period].calls += 1;
      if (call.status_detail === 'success') processedData[caller][period].success += 1;
      else if (call.status_detail === 'declined') processedData[caller][period].declines += 1;
    });

    const newPullDate = new Date().toISOString().split('T')[0];
    return {
      statusCode: 200,
      body: JSON.stringify({ processedData, newPullDate, totalCalls: allCalls.length })
    };
  } catch (error) {
    console.error('Error fetching data:', error.message, error.response?.data);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
