class AwsHelperError {
  constructor(type, message, errors) {
    this.type = type;
    this.errors = errors;
    this.message = message;
  }
}

module.exports = AwsHelperError;
