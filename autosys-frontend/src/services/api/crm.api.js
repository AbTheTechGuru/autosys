import client from './client';

export const crmApi = {
  // Leads
  getLeads:    (p) => client.get('/leads',      { params: p }),
  getLead:     (id)     => client.get(`/leads/${id}`),
  createLead:  (body)   => client.post('/leads', body),
  updateLead:  (id, b)  => client.put(`/leads/${id}`, b),
  deleteLead:  (id)     => client.delete(`/leads/${id}`),
  addNote:     (id, n)  => client.post(`/leads/${id}/notes`, { content: n }),
  aiFollowup:  (id)     => client.post('/ai/followup', { lead_id: id }),
  updateStage: (id, s)  => client.patch(`/leads/${id}/stage`, { stage: s.toLowerCase() }),

  // Customers
  getCustomers:   (p) => client.get('/customers', { params: p }),
  getCustomer:    (id)    => client.get(`/customers/${id}`),
  updateCustomer: (id, b) => client.put(`/customers/${id}`, b),

  // Activity timeline
  getTimeline: (entityType, id) =>
    client.get(`/${entityType}/${id}/timeline`),
};
