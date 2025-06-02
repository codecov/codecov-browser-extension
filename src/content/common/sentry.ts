import {
  breadcrumbsIntegration,
  browserApiErrorsIntegration,
  BrowserClient,
  defaultStackParser,
  globalHandlersIntegration,
  makeFetchTransport,
  dedupeIntegration,
  Scope,
} from "@sentry/browser";

// Sentry config
// Browser extensions must initialize Sentry a bit differently to avoid
// conflicts between Sentry instances should the site the extension is running
// on also use Sentry. Read more here:
// https://docs.sentry.io/platforms/javascript/best-practices/browser-extensions/

const sentryClient = new BrowserClient({
  dsn: process.env.SENTRY_DSN,
  transport: makeFetchTransport,
  stackParser: defaultStackParser,
  integrations: [
    breadcrumbsIntegration,
    browserApiErrorsIntegration,
    globalHandlersIntegration,
    dedupeIntegration,
  ],
});

const Sentry = new Scope();
Sentry.setClient(sentryClient);
sentryClient.init();

export default Sentry;
