import client from './client';

export const socialApi = {
  // GET /social/posts — fetch post history
  getPosts:     (params) => client.get('/social/posts',    { params }),

  // POST /social/post — create + publish/schedule a post
  createPost:   (body)   => client.post('/social/post',    body),

  // POST /social/post-vehicle/:vehicleId — auto-post a vehicle listing
  postVehicle:  (vehicleId, platforms) =>
    client.post(`/social/post-vehicle/${vehicleId}`, { platforms }),

  // GET /social/analytics — engagement stats
  getAnalytics: (params) => client.get('/social/analytics', { params }),
};