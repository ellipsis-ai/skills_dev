// -----------------------------------------------------------------------------
// Mocking ellipsis
// -----------------------------------------------------------------------------
const Ellipsis = require('./ellipsis');
const ellipsis = new Ellipsis();
ellipsis.setEnv({
  // AWS_PROFILE: 'el-stag01-458075145501',
  AWS_PROFILE: 'mb-prod',
  AWS_REGION: 'us-east-1',
  // AWS_ACCESS_KEY: 'AKIAIH5ID467GQQ3AQHA',
  // AWS_SECRET_KEY: '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'
});
ellipsis.setTeamInfo({
  timeZone: "America/Los_Angeles"
});


"use strict";

var moment = require('moment');

const AwsApiError = require('./ellipsis_aws_helper_error')
const AwsHelper = require('./ellipsis_aws_helper');
const CertsFetcher = require('./ellipsis_certs_fetcher');

function decideRightMessage(certs) {
  var adesso = moment.utc();
  var messages = {
    total: certs.length,
    total_expired: 0,
    // this week
    critical: [],
    // this month
    warning: [],
    // in 2 months
    info:[],
    // noops
    noops: []
  };
  certs.map((c) => {
      if (c.is_expired) messages.total_expired = messages.total_expired + 1;
      else if (c.valid_to < moment.utc().add(7, 'd')) messages.critical.push(c);
      else if (c.valid_to < moment.utc().add(1, 'M')) messages.warning.push(c);
      else if (c.valid_to < moment.utc().add(2, 'M')) messages.info.push(c);
      else {
        messages.noops.push(c);
      };
    });
  return messages;
}

const urls = [
  "www.ownit.com",
  "ownit.com",
  "www.mn.co",
  "mn.co"
];

const awsHelper = new AwsHelper({
  AWS: ellipsis.AWS,
  userTimeZone: ellipsis.teamInfo.timeZone
});
const certsFetcher = new CertsFetcher({
  userTimeZone: ellipsis.teamInfo.timeZone
});

if (!awsHelper.validateAwsRegion(ellipsis.env.AWS_REGION)) {
  if (ellipsis.env.AWS_REGION) ellipsis.error(`Unknown region '${ellipsis.env.AWS_REGION}'`);
  else ellipsis.error(`AWS_REGION is not set.`);
}

awsHelper.validateAccessToApi()
.then((result) => {
  return Promise.all([awsHelper.certsFromAWS(), certsFetcher.getReducedCertsForUrls(urls)])
})
.then((certs) => {
  const flattened = [].concat.apply([], certs);
  const sorted = flattened.sort((a, b) => a.valid_to - b.valid_to);
  console.log(sorted.map((a) => [a.valid_to, a.source]));
  const messages = decideRightMessage(sorted);
  if (messages.critical.length > 0 || messages.warning.length > 0 || messages.info.length > 0) {
    ellipsis.success(messages);
  } else {
    ellipsis.noResponse();
  }
})
.catch((err) => {
  ellipsis.error(err);
});
