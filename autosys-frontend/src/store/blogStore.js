import { create } from 'zustand';

/**
 * AutoSys Blog Store
 * ──────────────────
 * Manages blog state: posts, categories, current post, filters, pagination.
 * Used by blog homepage, post page, and landing page blog section.
 */

// ── Shared demo data (used when API is not available) ──────────
export const DEMO_POSTS = [
  {
    id: '1',
    title: 'How Nigerian Car Dealers Are Closing 3x More Sales with CRM Software',
    slug: 'nigerian-car-dealers-closing-3x-more-sales-crm',
    excerpt: 'Discover how top dealerships in Lagos and Abuja are using CRM tools to track leads, automate follow-ups, and close more deals every month.',
    featured_image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80',
    author_name: 'Emeka Obi',
    category_slug: 'sales-crm',
    tags: ['crm', 'leads', 'sales', 'automation'],
    read_time: 7,
    view_count: 4821,
    published_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    featured: true,
    status: 'published',
  },
  {
    id: '2',
    title: '10 WhatsApp Marketing Tactics Every Nigerian Car Dealer Must Use in 2025',
    slug: 'whatsapp-marketing-tactics-nigerian-car-dealers-2025',
    excerpt: "WhatsApp is Nigeria's most powerful sales channel. Learn the 10 tactics top-performing dealers use to convert conversations into closed deals.",
    featured_image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80',
    author_name: 'Chidinma Okonkwo',
    category_slug: 'marketing',
    tags: ['whatsapp', 'marketing', 'leads'],
    read_time: 9,
    view_count: 7340,
    published_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    featured: true,
    status: 'published',
  },
  {
    id: '3',
    title: 'The Complete Guide to Pricing Your Used Cars for Maximum Profit in Nigeria',
    slug: 'guide-pricing-used-cars-maximum-profit-nigeria',
    excerpt: "Stop underpricing your inventory. Learn the data-driven pricing strategies that Nigeria's most profitable dealerships use to maximize margins.",
    featured_image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80',
    author_name: 'AutoSys Team',
    category_slug: 'inventory',
    tags: ['pricing', 'inventory', 'profit'],
    read_time: 8,
    view_count: 3210,
    published_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    featured: false,
    status: 'published',
  },
  {
    id: '4',
    title: 'How to Build a Car Dealership Website That Actually Converts in 2025',
    slug: 'build-car-dealership-website-converts-2025',
    excerpt: "Most dealership websites look great but convert terribly. Here's the conversion-focused framework top Nigerian dealers use to turn visitors into buyers.",
    featured_image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80',
    author_name: 'AutoSys Team',
    category_slug: 'technology',
    tags: ['website', 'conversion', 'seo'],
    read_time: 6,
    view_count: 2890,
    published_at: new Date(Date.now() - 31 * 86400000).toISOString(),
    featured: false,
    status: 'published',
  },
  {
    id: '5',
    title: 'AutoSys vs. Excel: Why Nigerian Dealers Are Finally Ditching Spreadsheets',
    slug: 'autosys-vs-excel-why-dealers-ditching-spreadsheets',
    excerpt: 'Millions of naira in deals are being lost because dealerships still run on Excel. Here\'s a brutally honest comparison.',
    featured_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    author_name: 'Biodun Adeyemi',
    category_slug: 'technology',
    tags: ['software', 'excel', 'management'],
    read_time: 5,
    view_count: 5120,
    published_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    featured: false,
    status: 'published',
  },
  {
    id: '6',
    title: 'From 8 to 31 Cars Per Month: The AutoSys Success Story of Okafor Motors',
    slug: 'okafor-motors-success-story-autosys',
    excerpt: 'Emeka Okafor struggled to scale his Lagos dealership past 8 cars per month. Six months after switching to AutoSys, they hit 31.',
    featured_image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80',
    author_name: 'AutoSys Team',
    category_slug: 'business-growth',
    tags: ['case-study', 'success', 'crm'],
    read_time: 10,
    view_count: 9640,
    published_at: new Date(Date.now() - 58 * 86400000).toISOString(),
    featured: false,
    status: 'published',
  },
];

export const DEMO_CATEGORIES = [
  { id: '1', name: 'Sales & CRM',    slug: 'sales-crm',      color: '#3B82F6', post_count: 1 },
  { id: '2', name: 'Inventory',      slug: 'inventory',      color: '#C8973A', post_count: 1 },
  { id: '3', name: 'Marketing',      slug: 'marketing',      color: '#8B5CF6', post_count: 1 },
  { id: '4', name: 'Business Growth',slug: 'business-growth',color: '#16A34A', post_count: 1 },
  { id: '5', name: 'Technology',     slug: 'technology',     color: '#F59E0B', post_count: 2 },
  { id: '6', name: 'Industry News',  slug: 'industry-news',  color: '#EC4899', post_count: 0 },
];

export const useBlogStore = create((set, get) => ({
  // ── State ─────────────────────────────────────────────────────
  posts:          [],
  featuredPosts:  [],
  categories:     [],
  currentPost:    null,
  relatedPosts:   [],
  total:          0,
  page:           1,
  totalPages:     1,
  loading:        false,
  error:          null,

  // Filters
  selectedCategory: null,
  selectedTag:      null,
  searchQuery:      '',

  // ── Actions ───────────────────────────────────────────────────

  setFilter: (key, value) => set({ [key]: value, page: 1 }),

  setPage: (page) => set({ page }),

  setPosts: (posts, total, totalPages) =>
    set({ posts, total, totalPages, loading: false }),

  setCurrentPost: (post) => set({ currentPost: post }),

  setRelatedPosts: (posts) => set({ relatedPosts: posts }),

  setCategories: (categories) => set({ categories }),

  setFeaturedPosts: (posts) => set({ featuredPosts: posts }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  // ── Computed helpers ──────────────────────────────────────────

  getFilteredPosts: () => {
    const { posts, selectedCategory, selectedTag, searchQuery } = get();
    return posts.filter((p) => {
      if (selectedCategory && p.category_slug !== selectedCategory) return false;
      if (selectedTag && !p.tags.includes(selectedTag)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.excerpt?.toLowerCase().includes(q);
      }
      return true;
    });
  },

  getCategoryLabel: (slug) => {
    const { categories } = get();
    return categories.find((c) => c.slug === slug)?.name || slug;
  },

  getCategoryColor: (slug) => {
    const { categories } = get();
    return categories.find((c) => c.slug === slug)?.color || '#C8973A';
  },
}));
