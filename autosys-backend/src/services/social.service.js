'use strict';

/**
 * AutoSys Social Media Service
 * ─────────────────────────────
 * Auto-posting to Facebook, Instagram, and TikTok Business APIs.
 * Supports manual posts and automation-triggered posts.
 */

const { supabase } = require('../config/supabase');
const logger       = require('../utils/logger');

// ── Meta (Facebook + Instagram) ───────────────────────────────
class MetaService {
  constructor() {
    this.baseUrl    = 'https://graph.facebook.com/v18.0';
    this.pageToken  = process.env.META_PAGE_ACCESS_TOKEN;
    this.pageId     = process.env.META_PAGE_ID;
    this.igAccountId = process.env.META_IG_ACCOUNT_ID;
  }

  async _request(method, path, body) {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify({ ...body, access_token: this.pageToken }) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (data.error) throw new Error(`Meta API error: ${data.error.message}`);
    return data;
  }

  // ── Facebook ─────────────────────────────────────────────────

  async postToFacebook(content, mediaUrls = []) {
    if (!this.pageToken || !this.pageId) {
      logger.warn('[Social] Meta credentials missing — skipping FB post');
      return { skipped: true, platform: 'facebook' };
    }

    if (mediaUrls.length > 0) {
      // Upload photos first, then post with attached photo IDs
      const photoIds = await Promise.all(
        mediaUrls.map((url) => this._uploadFBPhoto(url))
      );
      return this._request('POST', `/${this.pageId}/feed`, {
        message:        content,
        attached_media: photoIds.map((id) => ({ media_fbid: id })),
      });
    }

    return this._request('POST', `/${this.pageId}/feed`, { message: content });
  }

  async _uploadFBPhoto(imageUrl) {
    const result = await this._request('POST', `/${this.pageId}/photos`, {
      url: imageUrl, published: false,
    });
    return result.id;
  }

  // ── Instagram ─────────────────────────────────────────────────

  async postToInstagram(content, mediaUrl) {
    if (!this.pageToken || !this.igAccountId) {
      logger.warn('[Social] IG credentials missing — skipping');
      return { skipped: true, platform: 'instagram' };
    }

    if (!mediaUrl) throw new Error('Instagram requires at least one image');

    // Step 1: Create media container
    const container = await this._request('POST', `/${this.igAccountId}/media`, {
      image_url: mediaUrl,
      caption:   content,
    });

    // Step 2: Publish container
    return this._request('POST', `/${this.igAccountId}/media_publish`, {
      creation_id: container.id,
    });
  }

  async postCarouselToInstagram(content, mediaUrls) {
    if (!this.pageToken || !this.igAccountId) return { skipped: true };

    // Create individual containers for each image
    const children = await Promise.all(
      mediaUrls.map((url) =>
        this._request('POST', `/${this.igAccountId}/media`, {
          image_url:   url,
          is_carousel_item: true,
        })
      )
    );

    // Create carousel container
    const carousel = await this._request('POST', `/${this.igAccountId}/media`, {
      media_type: 'CAROUSEL',
      caption:    content,
      children:   children.map((c) => c.id).join(','),
    });

    // Publish
    return this._request('POST', `/${this.igAccountId}/media_publish`, {
      creation_id: carousel.id,
    });
  }
}

// ── TikTok Business API ───────────────────────────────────────
class TikTokService {
  constructor() {
    this.accessToken = process.env.TIKTOK_ACCESS_TOKEN;
    this.openId      = process.env.TIKTOK_OPEN_ID;
    this.baseUrl     = 'https://open.tiktokapis.com/v2';
  }

  async postVideo(videoUrl, title, description) {
    if (!this.accessToken) {
      logger.warn('[Social] TikTok credentials missing — skipping');
      return { skipped: true, platform: 'tiktok' };
    }

    // TikTok requires video upload (not just URL)
    // Phase 1: Init upload
    const initRes = await fetch(`${this.baseUrl}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title:         title.slice(0, 150),
          description:   description.slice(0, 2200),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet:  false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source:       'PULL_FROM_URL',
          video_url:    videoUrl,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    const initData = await initRes.json();
    if (initData.error?.code !== 'ok') {
      throw new Error(`TikTok error: ${initData.error?.message}`);
    }

    return { publishId: initData.data?.publish_id, platform: 'tiktok' };
  }
}

// ── Social Media Service ──────────────────────────────────────
class SocialMediaService {
  constructor() {
    this.meta   = new MetaService();
    this.tiktok = new TikTokService();
  }

  /**
   * Post to one or more platforms.
   * @param {string}   dealerId
   * @param {object}   postData - { platforms, content, mediaUrls, vehicleId }
   */
  async post(dealerId, { platforms, content, mediaUrls = [], vehicleId, scheduledAt = null }) {
    const results = [];

    for (const platform of platforms) {
      let result;

      try {
        switch (platform) {
          case 'facebook':
            result = await this.meta.postToFacebook(content, mediaUrls);
            break;
          case 'instagram':
            if (mediaUrls.length > 1) {
              result = await this.meta.postCarouselToInstagram(content, mediaUrls);
            } else {
              result = await this.meta.postToInstagram(content, mediaUrls[0]);
            }
            break;
          case 'tiktok':
            result = await this.tiktok.postVideo(mediaUrls[0], content, content);
            break;
          default:
            result = { skipped: true, reason: 'Unknown platform' };
        }

        // Persist
        const { data: post } = await supabase.from('social_posts').insert({
          dealer_id:    dealerId,
          platform,
          content,
          media_urls:   mediaUrls,
          vehicle_id:   vehicleId,
          status:       result.skipped ? 'skipped' : 'published',
          published_at: result.skipped ? null : new Date().toISOString(),
          platform_post_id: result?.id || result?.publishId || null,
          metadata:     result,
        }).select().single();

        results.push({ platform, success: !result.skipped, postId: post?.id, data: result });
      } catch (err) {
        logger.error({ err, platform, dealerId }, '[Social] Post failed');
        results.push({ platform, success: false, error: err.message });

        // Persist failed attempt
        await supabase.from('social_posts').insert({
          dealer_id: dealerId, platform, content, media_urls: mediaUrls,
          vehicle_id: vehicleId, status: 'failed',
          metadata:   { error: err.message },
        });
      }
    }

    return results;
  }

  /**
   * Auto-generate and post vehicle content.
   * Called when a new vehicle is added or automation fires.
   */
  async postVehicle(dealerId, vehicle, platforms = ['facebook', 'instagram']) {
    const content = this._buildVehicleCaption(vehicle);
    return this.post(dealerId, {
      platforms,
      content,
      mediaUrls:  vehicle.image_urls?.slice(0, 4) || [],
      vehicleId:  vehicle.id,
    });
  }

  /**
   * Get social post history for a dealer.
   */
  async getHistory(dealerId, { platform, limit = 30, offset = 0 } = {}) {
    let query = supabase.from('social_posts')
      .select('*').eq('dealer_id', dealerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (platform) query = query.eq('platform', platform);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Generate a vehicle social media caption.
   */
  _buildVehicleCaption(vehicle) {
    const features = vehicle.features?.slice(0, 3).join(' • ') || '';
    const km       = vehicle.mileage?.toLocaleString();
    const cond     = vehicle.condition?.replace('_', ' ');

    return `🚗 ${vehicle.year} ${vehicle.brand} ${vehicle.model}
${cond?.toUpperCase()} | ${km}km | ${vehicle.fuel_type?.toUpperCase()}

✅ ${features}

💰 Contact us for the best price!

📲 DM us or click the link in bio to enquire.
#${vehicle.brand}${vehicle.model} #${vehicle.brand} #CarForSale #AutoSys #CarDealer`;
  }
}

module.exports = new SocialMediaService();
