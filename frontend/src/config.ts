/** Base URL of the API. Empty string uses the Vite dev proxy (/api -> :5000). */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

/**
 * Public site URL for canonical links. Empty until a custom domain is
 * connected; set VITE_SITE_URL when deploying.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) ?? '';

export const APP_NAME = 'SmartFlow AI';

export const DEMO_DISCLAIMER =
  'SmartFlow AI is a demonstration and simulation platform for intelligent traffic management and emergency vehicle prioritization. Real-world deployment requires authorized infrastructure integration, certified traffic-control systems, safety validation and applicable regulatory approval.';
