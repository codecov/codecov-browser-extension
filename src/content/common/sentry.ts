import {
  BrowserClient,
  defaultStackParser,
  getDefaultIntegrations,
  makeFetchTransport,
  Scope,
} from '@sentry/browser';

// Sentry config
// Browser extensions must initialize Sentry a bit differently to avoid 
// conflicts between Sentry instances should the site the extension is running
// on also use Sentry. Read more here:
// https://docs.sentry.io/platforms/javascript/best-practices/browser-extensions/

const sentryIntegrations = getDefaultIntegrations({}).filter(defaultIntegration => {
  return !['BrowserApiErrors', 'TryCatch', 'Breadcrumbs', 'GlobalHandlers'].includes(
    defaultIntegration.name
  );
});

const sentryClient = new BrowserClient({
  // @ts-ignore SENTRY_DSN is populated by Webpack at build time
  dsn: SENTRY_DSN,
  transport: makeFetchTransport,
  stackParser: defaultStackParser,
  integrations: sentryIntegrations,
});

const Sentry = new Scope();
Sentry.setClient(sentryClient);
sentryClient.init();

export default Sentry
