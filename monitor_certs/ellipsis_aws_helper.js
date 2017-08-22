"use strict";

var AWS = require('aws-sdk');
const Q = require('q');
const AwsHelperError = require('./ellipsis_aws_helper_error');
const moment = require('moment-timezone');

class AwsHelper {

  constructor(config) {
    this.config = config;
    this.AWS = config.AWS;
    this.userTimeZone = config.userTimeZone || "UTC";
    this.iamPromise = Q.fcall(() => {
      return new this.AWS.IAM();
    });
  }

  setAwsConfig(newAwsConfig) {
    this.config = newConfig;
    AWS.config.update(this.config);
    return this.config;
  }

  handleApiError(response, errorType, message) {
    const errors = [];
    if (response.statusCode == 403) {
      errors.push("Invalid Crendentials, check the AWS_ACCESS_KEY and AWS_SECRET_KEY.");
    } else {
      errors.push(response.message);
    }
    throw new AwsHelperError(errorType, message, errors);
  }

  validateAccessToApi() {
    return this.iamPromise
              .then((iam) => {
                return iam.getUser({}).promise();
              })
              .then((data) => {
                 return data.User || {};
              })
              .catch((error) => {
                 this.handleApiError(error, "AWS_API_ERROR", "I cannot connect to the AWS API.");
              });
  }

  certsFromIAM() {
    return this.iamPromise
          .then((iam) => {
            return iam.listServerCertificates({}).promise();
          })
          .then((data) => {
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
                  serial_number: ea.ServerCertificateId,
                  source: "AWS Iam Service"
                 };
              });
            });
  }

  certArnsFromACM(acm) {
    return acm.listCertificates({}).promise()
             .then((data) => {
               return data.CertificateSummaryList
                        .map((ea) => {
                          return ea.CertificateArn;
                        });
             });
  }

  certInfoFromArn(arn, acm) {
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
  }

  certsFromACM() {
    const acm = new this.AWS.ACM();
    return this.certArnsFromACM(acm)
            .then((arns) => {
              return Q.all(
                arns.map((arn) => this.certInfoFromArn(arn, acm))
              );
            });
  }

  certsFromAWS() {
    return Q.all([this.certsFromIAM(), this.certsFromACM()])
              .then((certLists) => {
                const flattened = [].concat.apply([], certLists);
                const refined = flattened.map((ea) => {
                  ea.is_expired = moment.utc(ea.valid_to) < moment.utc();
                  const dateFormat = "ddd, MMM Do YYYY, h:mm:ss a z";
                  const dateM = moment.utc(ea.valid_to);
                  ea.valid_to_string_utc = dateM.format(dateFormat);
                  ea.valid_to_string_local = dateM.tz(this.userTimeZone).format(dateFormat);
                  return ea;
                });
                return refined.sort((a, b) => a.valid_to-b.valid_to);;
              });
  }

}
module.exports = AwsHelper;
