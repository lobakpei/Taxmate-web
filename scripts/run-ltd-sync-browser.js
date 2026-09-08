'use strict';

const path=require('node:path');
process.env.TAXMATE_LTD_SYNC_ONLY='1';
process.env.TAXMATE_PAID_SYNC_EVIDENCE=process.env.TAXMATE_PAID_SYNC_EVIDENCE||path.resolve(__dirname,'..','.ltd-sync-browser-evidence');
require('./run-paid-sync-browser');
