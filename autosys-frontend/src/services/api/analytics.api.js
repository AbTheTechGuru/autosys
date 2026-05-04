import client from './client';

export const analyticsApi = {
  overview:    (period) => client.get('/analytics/overview',  { params: { period } }),
  revenue:     (period) => client.get('/analytics/revenue',   { params: { period } }),
  leads:       (period) => client.get('/analytics/leads',     { params: { period } }),
  funnel:      ()       => client.get('/analytics/funnel'),
  heatmap:     (period) => client.get('/analytics/heatmap',   { params: { period } }),
  topVehicles: ()       => client.get('/analytics/top-vehicles'),
  agentKpis:   ()       => client.get('/analytics/agents'),
  website:     (period) => client.get('/analytics/website',   { params: { period } }),
};
