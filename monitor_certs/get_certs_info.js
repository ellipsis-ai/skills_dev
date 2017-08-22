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

const Q = require('q');
var moment = require('moment');
const AwsApiError = require('./ellipsis_aws_helper_error')
const AwsHelper = require('./ellipsis_aws_helper');
const CertsFetcher = require('./ellipsis_certs_fetcher');

function buildExpirationGroups(certs) {
  var adesso = moment.utc();
  var groups = {
    total: certs.length,
    expired: [],
    expirings_in_more_then_12_months: [],
    expirings_4_12_months: [],
    expiring_2_3_months: [],
    expiring_16_30_days: [],
    expiring_8_15_days: [],
    expiring_2_7_days: [],
    expiring_tomorrow: [],
    expiring_today: []
  };
  certs.map((c) => {
      if (c.is_expired) groups.expired.push(c);
      else if (c.valid_to < moment.utc().endOf('day')) groups.expiring_today.push(c);
      else if (c.valid_to < moment.utc().add(1, 'd')) groups.expiring_tomorrow.push(c);
      else if (c.valid_to < moment.utc().add(7, 'd')) groups.expiring_2_7_days.push(c);
      else if (c.valid_to < moment.utc().add(15, 'd')) groups.expiring_8_15_days.push(c);
      else if (c.valid_to < moment.utc().add(1, 'M')) groups.expiring_16_30_days.push(c);
      else if (c.valid_to < moment.utc().add(3, 'M')) groups.expiring_2_3_months.push(c);
      else if (c.valid_to < moment.utc().add(12, 'M')) groups.expirings_4_12_months.push(c);
      else {
        groups.expirings_in_more_then_12_months.push(c);
      };
    });
  return groups;
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
const certsFetcher = new CertsFetcher();

awsHelper.validateAccessToApi()
.then((result) => {
  return Q.all([awsHelper.certsFromAWS(), certsFetcher.getReducedCertsForUrls(urls)])
})
.then((certs) => {
  const flattened = [].concat.apply([], certs);
  return buildExpirationGroups(flattened);
})
.then((certs) => {
  ellipsis.success(certs);
})
.catch((err) => {
  ellipsis.error(err);
});
