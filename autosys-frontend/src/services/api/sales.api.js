import client from './client';

export const salesApi = {
  // Vehicles / Inventory
  getVehicles:   (p)     => client.get('/vehicles',       { params: p }),
  getVehicle:    (id)    => client.get(`/vehicles/${id}`),
  createVehicle: (body)  => client.post('/vehicles',       body),
  updateVehicle: (id, b) => client.put(`/vehicles/${id}`, b),
  deleteVehicle: (id)    => client.delete(`/vehicles/${id}`),
  bulkVehicles:  (body)  => client.post('/vehicles/bulk',  body),

  // Deals / Pipeline
  getDeals:    (p)     => client.get('/deals',       { params: p }),
  getDeal:     (id)    => client.get(`/deals/${id}`),
  createDeal:  (body)  => client.post('/deals',       body),
  updateDeal:  (id, b) => client.put(`/deals/${id}`, b),
  moveDeal:    (id, stage) => client.patch(`/deals/${id}/stage`, { stage }),
  deleteDeal:  (id)    => client.delete(`/deals/${id}`),

  // Commission
  getCommissions: (period) => client.get('/commissions', { params: { period } }),
};

export const vehicleImageApi = {
  // Upload images — sends base64 array to backend
  uploadImages: (vehicleId, images) =>
    client.post(`/vehicles/${vehicleId}/images`, { images }),

  // Remove one image URL
  deleteImage: (vehicleId, url) =>
    client.delete(`/vehicles/${vehicleId}/images`, { data: { url } }),
};
