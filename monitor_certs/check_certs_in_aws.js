// -----------------------------------------------------------------------------
// Mocking ellipsis
// -----------------------------------------------------------------------------
const Ellipsis = require('./ellipsis');
const ellipsis = new Ellipsis();
ellipsis.setEnv({
  // AWS_PROFILE: 'el-stag01-458075145501',
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY: 'AKIAIH5ID467GQQ3AQHA',
  AWS_SECRET_KEY: '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'
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
const dateFormat = require('dateformat');
const AwsApiError = require('./aws_helper_error')
const AwsHelper = require('./ellipsis-aws-helper');


function certsFromIAM() {
  const iam = new ellipsis.AWS.IAM();
  return iam.listServerCertificates({}).promise()
        .then( (data) => {
          return data.ServerCertificateMetadataList
            .sort((a, b) => a.Expiration.value - b.Expiration.value)
            .map((ea) => {
              return { identifier: ea.Arn, expiration: ea.Expiration };
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
            r = {
              identifier: data.Certificate.DomainName,
              expiration: data.Certificate.NotAfter
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
})
.then((certLists) => {
  console.log(certLists);
  const flattened = [].concat.apply([], certLists);
  const result = flattened.map((ea) => {
    const expirationStr = dateFormat(ea.expiration, "dddd, mmmm dS, yyyy");
    return { identifier: ea.identifier, expiration: expirationStr };
  });
  ellipsis.success(result);
}).catch((err) => {
  ellipsis.error(err);
});
