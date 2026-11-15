import { api } from './api.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return api(request, env);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, {status: 405});
    if (/^\/(?:welcome|wall|admin|reports|people|groups(?:\/\d+)?|messages(?:\/\d+)?|(?:post|profile)\/\d+)\/?$/.test(url.pathname)) url.pathname = '/';
    return env.ASSETS.fetch(new Request(url, request));
  }
};
