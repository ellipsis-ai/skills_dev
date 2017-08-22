"use strict";

var https = require('https');
var moment = require('moment');

function isEmpty(object) {
  for(var prop in object) {
    if(object.hasOwnProperty(prop))
      return false;
  }
  return true;
};

class CertsFetcher {

  constructor(options={}) {
    this.userTimeZone = options.userTimeZone || "UTC";
  }

  getCert(url) {
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
  };

  getCertsForUrls(urls) {
     return Promise.all(urls.map((url) => this.getCert(url)));
  }

  getReducedCertsForUrls(urls) {
    return Promise.all(urls.map((url) => this.getCert(url)))
              .then((certs) => {
                return certs.map((cert) => {
                  const validToM = moment.utc(cert.valid_to, "MMM D HH:mm:ss YYYY");
                  const dateFormat = "ddd, MMM Do YYYY, h:mm:ss a z";
                  return {
                    identifier: cert.serialNumber,
                    url: cert.url,
                    valid_from: moment.utc(cert.valid_from, "MMM D HH:mm:ss YYYY"),
                    valid_to: validToM,
                    domains: cert.subjectaltname.split(',').map((ea) => ea.trim().slice(4)),
                    serial_number: cert.serialNumber,
                    is_expired: validToM < moment.utc(),
                    source: `HTTPS/${cert.url}`,
                    valid_to_string_utc: validToM.format(dateFormat),
                    valid_to_string_local: validToM.tz(this.userTimeZone).format(dateFormat)
                  };
                });
              });
  }
}

module.exports = CertsFetcher;
