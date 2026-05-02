import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const DEFAULT_SCRIPT = `<!-- Matomo -->
<script>
  var _paq = window._paq = window._paq || [];
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function () {
    var u = "https://matomo.brickfire.eu/";
    _paq.push(['setTrackerUrl', u + 'matomo.php']);
    _paq.push(['setSiteId', '3']);
    _paq.push(['requireCookieConsent']);
    var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
    g.async = true; g.src = u + 'matomo.js'; s.parentNode.insertBefore(g, s);
  })();
</script>
<!-- End Matomo Code -->`;

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const custom = env.CUSTOM_SCRIPT || '';
  const html = await response.text();
  const injection = custom ? DEFAULT_SCRIPT + '\n' + custom : DEFAULT_SCRIPT;
  const modified = html.replace('</head>', injection + '\n</head>');

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(modified, { status: response.status, headers });
};