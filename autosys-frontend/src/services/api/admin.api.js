import client from './client';

export const adminApi = {
  // Dealer management
  getDealers:      (p)  => client.get('/admin/dealers',              { params: p }),
  getDealer:       (id) => client.get(`/admin/dealers/${id}`),
  suspendDealer:   (id) => client.post(`/admin/dealers/${id}/suspend`),
  restoreDealer:   (id) => client.post(`/admin/dealers/${id}/restore`),
  loginAsDealer:   (id) => client.post(`/admin/dealers/${id}/login-as`),
  createDealer:    (b)  => client.post('/admin/dealers', b),

  // Plan management
  getPlans:    ()      => client.get('/admin/plans'),
  updatePlan:  (id, b) => client.put(`/admin/plans/${id}`, b),

  // Platform stats
  getMrrStats:      ()       => client.get('/admin/mrr'),
  getPlatformStats: ()       => client.get('/admin/stats'),

  // Support
  getTickets:    (p)     => client.get('/admin/support',            { params: p }),
  getTicket:     (id)    => client.get(`/admin/support/${id}`),
  resolveTicket: (id)    => client.patch(`/admin/support/${id}`,   { status: 'Resolved' }),
};
