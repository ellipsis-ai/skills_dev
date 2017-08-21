// -----------------------------------------------------------------------------
// Mocking ellipsis
// -----------------------------------------------------------------------------
const Ellipsis = require('./ellipsis');
const ellipsis = new Ellipsis();
ellipsis.setEnv({
  ADROLL_API_KEY: 'NGkHNFC9xmjE6JIOnGBDjxfSdVwEaj1s'
});
ellipsis.setAccessTokens({
  adRollApp: ""
});
ellipsis.setTeamInfo({
  timeZone: "America/Los_Angeles"
});



// This is skill helps you monitor your sites SSL certs expiration dates.
// inputs:
//    list of url
//    aws account credentials
//      will monitor all certs under the Certs Manager
//      will monitor all certs loaded in ELBs
//
//
//  The list of url to monitor are stored in the Default Storage

"use strict";

const Q = require('q');
var _ = require('lodash');
var moment = require('moment');

var https = require('https');

function isEmpty(object) {
  for(var prop in object) {
    if(object.hasOwnProperty(prop))
      return false;
  }
  return true;
}

function get(url) {
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
        resolve(certificate);
      }
    });

    req.on('error', function(e) {
      reject(e);
    });

    req.end();
  });
}

get("www.ellipsis.ai")
.then((cert) => {
  console.log(cert);
})
