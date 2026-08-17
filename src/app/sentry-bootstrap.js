'use strict';
window.sentryOnLoad=function(){Sentry.init({sendDefaultPii:false,beforeSend:TaxMateTelemetry.scrubSentryEvent});};

