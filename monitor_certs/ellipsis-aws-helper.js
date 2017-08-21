"use strict";

var AWS = require('aws-sdk');
const Q = require('q');
const AwsHelperError = require('./aws_helper_error');


class AwsHelper {

  constructor(config) {
    this.config = config;
    this.AWS = config.AWS;
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
    console.log(response);
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


}
module.exports = AwsHelper;
