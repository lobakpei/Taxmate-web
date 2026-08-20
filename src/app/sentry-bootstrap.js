'use strict';
window.sentryOnLoad=function(){Sentry.init({sendDefaultPii:false,maxBreadcrumbs:0,beforeSend:TaxMateTelemetry.scrubSentryEvent});};
