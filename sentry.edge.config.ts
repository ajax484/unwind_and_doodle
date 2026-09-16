import * as Sentry from '@sentry/nextjs';
import { sanitizeData, sanitizeHeaders } from './src/lib/observability/error-monitoring';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    beforeSend(event) {
      if (event.request) {
        if (event.request.headers) {
          event.request.headers = sanitizeHeaders(event.request.headers);
        }
        if (event.request.data) {
          event.request.data = sanitizeData(event.request.data);
        }
        if (event.request.cookies) {
          event.request.cookies = {};
        }
      }

      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => ({
          ...bc,
          data: bc.data ? sanitizeData(bc.data) : undefined,
        }));
      }

      if (event.extra) {
        event.extra = sanitizeData(event.extra);
      }

      return event;
    },
  });
}
