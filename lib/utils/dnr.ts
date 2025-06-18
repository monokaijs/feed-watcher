export const configureDNR = async () => {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = existingRules.map(rule => rule.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
    addRules: [{
      id: 1,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        requestHeaders: [{
          header: 'Origin',
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: 'https://www.facebook.com',
        }, {
          header: 'Referer',
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: 'https://www.facebook.com',
        }],
      },
      condition: {
        urlFilter: 'https://*.facebook.com/*',
      },
    }]
  });
}
