import { create } from 'zustand';
import { blogApi, adminBlogApi } from '@/services/api/index';

/**
 * AutoSys Blog Store
 * All state driven from backend. No hardcoded demo data.
 */
export const useBlogStore = create((set, get) => ({
  // ── Public blog state ──────────────────────────────────────
  posts:        [],
  categories:   [],
  currentPost:  null,
  featuredPosts:[],
  pagination:   { page: 1, limit: 12, total: 0, hasMore: false },
  filters:      { category: '', tag: '', search: '', featured: false },
  isLoading:    false,
  error:        null,

  // ── Admin blog state ───────────────────────────────────────
  adminPosts:      [],
  adminAnalytics:  null,
  isAdminLoading:  false,

  // ── Public: fetch paginated posts ──────────────────────────
  fetchPosts: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await blogApi.getPosts({ ...get().filters, ...params });
      const posts = data.posts ?? data.data ?? [];
      set({
        posts:      params.page > 1 ? [...get().posts, ...posts] : posts,
        pagination: {
          page:    data.page    ?? params.page ?? 1,
          limit:   data.limit   ?? 12,
          total:   data.total   ?? posts.length,
          hasMore: data.hasMore ?? (posts.length === (params.limit ?? 12)),
        },
        categories: data.categories ?? get().categories,
      });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load posts' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const { data } = await blogApi.getCategories();
      set({ categories: data.categories ?? data ?? [] });
    } catch { /* keep empty */ }
  },

  fetchFeatured: async () => {
    try {
      const { data } = await blogApi.getFeatured();
      set({ featuredPosts: data.posts ?? data ?? [] });
    } catch { /* keep empty */ }
  },

  fetchPost: async (slug) => {
    set({ isLoading: true, error: null, currentPost: null });
    try {
      const { data } = await blogApi.getPost(slug);
      set({ currentPost: data.post ?? data });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Post not found' });
    } finally {
      set({ isLoading: false });
    }
  },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value } }));
  },

  // ── Admin: fetch all posts ─────────────────────────────────
  fetchAdminPosts: async (params = {}) => {
    set({ isAdminLoading: true });
    try {
      const { data } = await adminBlogApi.listAll(params);
      set({ adminPosts: data.posts ?? data ?? [] });
    } catch { /* keep empty */ } finally {
      set({ isAdminLoading: false });
    }
  },

  fetchAdminAnalytics: async () => {
    try {
      const { data } = await adminBlogApi.getAnalytics();
      set({ adminAnalytics: data });
    } catch { /* keep null */ }
  },

  // ── Admin: toggle publish ──────────────────────────────────
  togglePublish: async (id) => {
    const post = get().adminPosts.find((p) => p.id === id);
    if (!post) return;
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    // Optimistic
    set((s) => ({
      adminPosts: s.adminPosts.map((p) => p.id === id ? { ...p, status: newStatus } : p),
    }));
    try {
      await adminBlogApi.togglePublish(id);
    } catch {
      // Revert on error
      set((s) => ({
        adminPosts: s.adminPosts.map((p) => p.id === id ? { ...p, status: post.status } : p),
      }));
      throw new Error('Publish toggle failed');
    }
  },

  // ── Admin: delete ──────────────────────────────────────────
  deletePost: async (id) => {
    const prev = get().adminPosts;
    set((s) => ({ adminPosts: s.adminPosts.filter((p) => p.id !== id) }));
    try {
      await adminBlogApi.delete(id);
    } catch {
      set({ adminPosts: prev });
      throw new Error('Delete failed');
    }
  },

  // ── Admin: create/update ───────────────────────────────────
  savePost: async (id, formData) => {
    if (id) {
      const { data } = await adminBlogApi.update(id, formData);
      const saved = data.post ?? data;
      set((s) => ({
        adminPosts: s.adminPosts.map((p) => p.id === id ? saved : p),
      }));
      return saved;
    } else {
      const { data } = await adminBlogApi.create(formData);
      const saved = data.post ?? data;
      set((s) => ({ adminPosts: [saved, ...s.adminPosts] }));
      return saved;
    }
  },
}));
