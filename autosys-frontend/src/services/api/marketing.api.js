import client from './client';

export const marketingApi = {
  // Campaigns
  getCampaigns:    (p)     => client.get('/campaigns',         { params: p }),
  getCampaign:     (id)    => client.get(`/campaigns/${id}`),
  createCampaign:  (body)  => client.post('/campaigns',         body),
  updateCampaign:  (id, b) => client.put(`/campaigns/${id}`,   b),
  deleteCampaign:  (id)    => client.delete(`/campaigns/${id}`),
  launchCampaign:  (id)    => client.post(`/campaigns/${id}/launch`),
  pauseCampaign:   (id)    => client.post(`/campaigns/${id}/pause`),

  // Templates
  getTemplates:   ()     => client.get('/campaign-templates'),
  createTemplate: (body) => client.post('/campaign-templates', body),

  // Automations
  getAutomations:    ()        => client.get('/automations'),
  toggleAutomation:  (id, on) => client.patch(`/automations/${id}`, { enabled: on }),
  createAutomation:  (body)   => client.post('/automations', body),

  // AI message generation (proxied through backend)
  generateMessage: (payload) => client.post('/ai/campaign-message', payload),
};
