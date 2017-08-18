class AdrollError {
  constructor(type, errors, message) {
    this.type = type;
    this.errors = errors;
    this.message = message;
  }
}

module.exports = AdrollError;
