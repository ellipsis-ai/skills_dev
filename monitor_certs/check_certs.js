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
var https = require('https');

function isEmpty(object) {
  for(var prop in object) {
    if(object.hasOwnProperty(prop))
      return false;
  }
  return true;
}

function getCert(url) {
  if (url.length <= 0 || typeof url !== 'string') {
    throw Error("A valid URL is required");
  }

  var options = {
    hostname: url,
    agent: false,
    rejectUnauthorized: false,
    ciphers: "ALL",
  };

  return new Promise(function (resolve, reject) {
    var req = https.get(options, function(res) {
      var certificate = res.socket.getPeerCertificate();
      if(isEmpty(certificate) || certificate === null) {
        reject({message: 'The website did not provide a certificate'});
      } else {
        certificate.url = options.hostname;
        resolve(certificate);
      }
    });
    req.on('error', function(e) { reject(e); });
    req.end();
  });
}

function getCertsForUrls(urls) {
   return Q.all(urls.map((url) => getCert(url)));
}

function getReducedCertsForUrls(urls) {
  return Q.all(urls.map((url) => getCert(url)))
            .then((certs) => {
              return certs.map((cert) => {
                const validToM = moment(cert.valid_to, "MMM D HH:mm:ss YYYY z");
                return {
                  identifier: cert.serialNumber,
                  url: cert.url,
                  valid_from: moment(cert.valid_from, "MMM D HH:mm:ss YYYY z"),
                  valid_to: validToM,
                  domains: cert.subjectaltname.split(',').map((ea) => ea.trim().slice(4)),
                  serial_number: cert.serialNumber,
                  is_expired: validToM < moment.utc(),
                  source: `HTTPS request to ${cert.url}`,
                };
              });
            });
}

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

const AwsApiError = require('./aws_helper_error')
const AwsHelper = require('./ellipsis-aws-helper');
const awsHelper = new AwsHelper({
  AWS: ellipsis.AWS,
  userTimeZone: ellipsis.teamInfo.timeZone
});

awsHelper.validateAccessToApi()
.then((result) => {
  return Q.all([awsHelper.certsFromAWS(), getReducedCertsForUrls(urls)])
})
.then((certs) => {
  const flattened = [].concat.apply([], certs);
  returns buildExpirationGroups(flattened);
})
.then((certs) => {
  ellipsis.success(certs);
})
.catch((err) => {
  ellipsis.error(err);
});
