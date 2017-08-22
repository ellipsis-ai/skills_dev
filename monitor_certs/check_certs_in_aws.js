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
ellipsis.setAccessTokens({
  adRollApp: ""
});
ellipsis.setTeamInfo({
  timeZone: "America/Los_Angeles"
});


// -----------------------------------------------------------------------------
// Action
// -----------------------------------------------------------------------------
"use strict";

var AWS = require('aws-sdk');
const Q = require('q');
const moment = require('moment-timezone');
const AwsApiError = require('./aws_helper_error')
const AwsHelper = require('./ellipsis-aws-helper');

const userTimeZone = ellipsis.teamInfo.timeZone;

function certsFromIAM() {
  const iam = new ellipsis.AWS.IAM();
  return iam.listServerCertificates({}).promise()
        .then( (data) => {
          return data.ServerCertificateMetadataList
            .map((ea) => {
              //   Path: '/',
              //   ServerCertificateName: 'www.smallbusinessbiggame.com_last',
              //   ServerCertificateId: 'ASCAJPWXQE3XHOHX3ZUUG',
              //   Arn: 'arn:aws:iam::439567033621:server-certificate/www.smallbusinessbiggame.com_last',
              //   UploadDate: 2017-07-18T00:03:29.000Z,
              //   Expiration: 2018-07-18T23:59:59.000Z }
              return {
                identifier: ea.ServerCertificateName,
                arn: ea.Arn,
                name: ea.ServerCertificateName,
                valid_to: ea.Expiration,
                is_expired: moment(ea.Expiration) < moment.utc(),
                source: "AWS Iam Service"
               };
            });
          });
};


function certArnsFromACM(acm) {
  return acm.listCertificates({}).promise()
           .then((data) => {
             return data.CertificateSummaryList
                      .map((ea) => {
                        return ea.CertificateArn;
                      });
           });
};

function certInfoFromArn(arn, acm) {
  return acm.describeCertificate({ CertificateArn: arn }).promise()
        .then( (data) => {
          var r = {};
          if (data.Certificate) {
            console.log(data.Certificate);
            r = {
              identifier: data.Certificate.DomainName,
              arn: data.Certificate.CertificateArn,
              domain: data.Certificate.DomainName,
              valid_from: data.Certificate.NotBefore,
              valid_to: data.Certificate.NotAfter,
              source: "AWS ACM Service",
              in_use_by_aws: !!data.Certificate.InUseBy.length
            };
          }
          return r;
        });
};

function certsFromACM() {
  const acm = new ellipsis.AWS.ACM();
  return certArnsFromACM(acm)
          .then((arns) => {
            return Q.all(
              arns.map((arn) => certInfoFromArn(arn, acm))
            );
          });
};


const awsHelper = new AwsHelper({
  AWS: ellipsis.AWS
});
awsHelper.validateAccessToApi()
.then((result) => {
  return Q.all([certsFromIAM(), certsFromACM()]);
  // return Q.all([certsFromIAM()]);
})
.then((certLists) => {
  const flattened = [].concat.apply([], certLists);
  const refined = flattened.map((ea) => {
    ea.is_expired = moment.utc(ea.valid_to) < moment.utc();
    ea.valid_to_string_utc = moment.utc(ea.valid_to).format("ddd, MMM Do YYYY, h:mm:ss a z");
    ea.valid_to_string_local = moment.utc(ea.valid_to).tz(userTimeZone).format("ddd, MMM Do YYYY, h:mm:ss a z");
    return ea;
  });
  const sorted = refined.sort((a, b) => {
    if (moment(a.valid_to) > moment.utc(b.valid_to)) return 1;
    else if (moment(a.valid_to) < moment.utc(b.valid_to)) return -1;
    else return 0;
  });

  ellipsis.success(sorted);
}).catch((err) => {
  ellipsis.error(err);
});
