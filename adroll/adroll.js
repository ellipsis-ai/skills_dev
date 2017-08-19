const AdRollError = require('./adroll_error');
const graphqlRequest = require('graphql-request');
const Q = require('q');

// Takes a list of AdRoll Campaign objects and create an
// array of csv records.
function extractAMReportRecords(campaigns) {
  var records = [];
  campaigns.forEach((c) => {
    c.adgroups.forEach((adGroup) => {
      adGroup.ads.forEach((ad) => {
        ad.metrics.byDate.forEach((m) => {
          records.push(
            [
              m.date,
              (new Date(m.date)).toLocaleString('en-us', {weekday: 'long'}),
              c.type || "",
              c.channel || "",
              c.name,
              adGroup.name,
              ad.status,
              ad.name,
              ad.width + "x" + ad.height,
              ad.type,
              m.cost,
              m.impressions,
              m.clicks,
              m.viewThroughs || "",
              m.clickThroughs || "",
              m.viewRevenue || "",
              m.clickRevenue || ""
            ].join()
          );
        });
      });
    });
  });
  return records;
};


const Adroll = {

  buildGraphQLClient: function(apiKey, oauth2Token) {
    const endpoint  = 'https://services.adroll.com/reporting/api/v1/query?apikey=' + apiKey;
    // const authHeaderValue = "Bearer " + oauth2Token;
    const authHeaderValue = "Basic bUBlbGxpcHNpcy5haTphNCZVWiM2ZmZa";
    return new graphqlRequest.GraphQLClient(endpoint, {
      headers: { Authorization: authHeaderValue }
    });
  },

  validateAdRollAPIisReacheable: function(graphQLClient) {
    const query = `query { organization { current { name } } }`;
    return graphQLClient.request(query)
      .catch((response) => {
        const errors = [];
        if (response.name === 'FetchError') {
          // API is unreacheable
          errors.push(response.message);
        } else {
          response.response.errors.forEach((ea) => errors.push(ea));
        }
        throw new AdRollError("API_ERROR", "Cannot reach the AdRoll API. Maybe it is offline.", errors);
      });
  },

  validateAdvertasibleEID: function(advertasibleEID, graphQLClient) {
    const query = `{
      advertisable {
        byEID(advertisable: $advertasibleEID) {
          organization
        }
      }
    }`;
    const variables = {
      advertasibleEID: advertasibleEID
    };
    return graphQLClient.request(query, variables)
      .catch((response) => {
          var errors = [];
          if (response.name === 'FetchError') {
            // API is unreacheable
            errors.push(response.message);
          } else {
            errors = errors.concat(response.response.errors);
          }
          throw new AdRollError("EID_ERROR", `The EID ${advertasibleEID} is invalid.`, errors);
      });
  },

  validateDateRange: function(dateRange, userInput) {
    return new Promise((resolve, reject) => {
      if (!dateRange) {
        reject(new AdRollError("DATE_RANGE_ERROR", `The date range "${userInput}" is invalid`, ["A valid date range cannot be parsed."]));
      }

      var errors = [];
      if (!dateRange.start) {
        errors.push("start date is not defined");
      }
      if (!dateRange.end){
        errors.push("end date is not defined");
      }
      if (dateRange.start && dateRange.end && (dateRange.start > dateRange.end) ) {
        errors.push("Start date cannot be greater then end date");
      }
      if (errors.length > 0) {
        reject(new AdRollError("DATE_RANGE_ERROR", `The date range "${userInput}" is invalid`, errors));
      }

      resolve();
    });
  },

  getReportRecords: function(inputs, graphQLClient) {
    const csvHeaders = [
      "date",
      "day_of_week",
      "product",
      "inventory_source",
      "campaign",
      "adgroup",
      "status",
      "ad",
      "ad_size",
      "type",
      "cost",
      "impressions",
      "clicks",
      "adjusted_total_conversions",
      "adjusted_ctc",
      "adjusted_vtc",
      "attributed_rev",
      "attributed_click_through_rev",
      "attributed_view_through_rev"
    ].join(",");

    const query = `{
      advertisable {
        byEID(advertisable: $advertasibleEID) {
          eid
          name
          campaigns {
            name
            adgroups {
              name
              ads {
                name
                status
                type
                height
                width
                adFormatName
                metrics(start: $startDate, end: $endDate, currency: "USD") {
                  byDate {
                    impressions
                    clicks
                    cost
                    viewThroughs
                    clickThroughs
                    viewRevenue
                    clickRevenue
                    date
                  }
                }
              }
            }
          }
        }
      }
    }`;
    const variables = {
      advertasibleEID: inputs.advertasibleEID,
      startDate: inputs.dateRange.start.toISOString().slice(0,10),
      endDate: inputs.dateRange.end.toISOString().slice(0,10)
    };

    return graphQLClient.request(query, variables)
      .then((data) => {
         return {
           records: [csvHeaders].concat(extractAMReportRecords(data.advertisable.byEID.campaigns))
         };
      })
      .catch((response) => {
        const errors = [];
        if (response.name === 'FetchError') {
          // API is unreacheable
          errors.push(response.message);
        } else {
          console.log(response);
          response.response.errors.forEach((ea) => errors.push(ea));
        }
        throw new AdRollError("REPORT_ERROR", "An error occurred fetching the report", errors);
      });
  }

};

module.exports = Adroll;

// const validateAdRollAPIisReacheable = (graphQLClient) => {
//   const query = `query { organization { current { name } } }`;
//   return graphQLClient.request(query)
//             .catch((response) => {
//                 var message = "";
//                 if (response.name === 'FetchError') {
//                   message = "The AdRoll API is unreachable. Here is what I get when I called it: " +
//                             response.message;
//                 } else {
//                   message = "There is a problem in connecting to the AdRoll API. Here is what I get when I called it: " +
//                             JSON.stringify(response.response.errors);
//                 }
//                throw new Error(message);
//             });
// }
//
// const validateAdvertasibleEIDPromise = (advertasibleEID, graphQLClient) => {
//   const query = `{
//     advertisable {
//       byEID(advertisable: $advertasibleEID) {
//         organization
//       }
//     }
//   }`;
//   const variables = {
//     advertasibleEID: advertasibleEID
//   };
//   return graphQLClient.request(query, variables)
//             .then((response) => {
//               return {
//
//               }
//             })
//             .catch((response) => {
//                 var message = "";
//                 if (response.name === 'FetchError') {
//                   message = "The AdRoll API is unreachable. Here is what I get when I called it: " +
//                             response.message;
//                 } else {
//                   message = "The advertasibleEID '"+ advertasibleEID +"' is invalid. " +
//                   " We got the following error from the AdRoll API when validating the advertasibleEID:" +
//                   JSON.stringify(response.response.errors);
//                 }
//                 throw new Error(message);
//             });
// }
//
// const validateDateRange = (dateRange) => {
//   if (!dateRange) {
//     return {
//       value: dateRange,
//       errors: ["Cannot parse any date range from the input"]
//     }
//   }
//
//   var errors = [];
//   if (!dateRange.start) {
//     errors.push("start date is not defined");
//   }
//   if (!dateRange.end){
//     errors.push("end date is not defined");
//   }
//   if (dateRange.start && dateRange.end && (dateRange.start > dateRange.end) ) {
//     errors.push("Start date cannot be greater then end date");
//   }
//   if (errors.length > 0) {
//     return {
//       value: dateRange,
//       errors: errors
//     }
//   }
//   return { value: dateRange }
// }
//
// const validateInputsPromise = (inputs, options) => {
//   return validateAdvertasibleEIDPromise(inputs.advertasibleEID, options.graphQLClient)
//            .then(() => {
//              const dateRangeValidation = validateDateRange(inputs.dateRange);
//              if (dateRangeValidation.errors) {
//                throw new Error("The date range is invalid. Errors: " +
//                   JSON.stringify(dateRangeValidation.errors.join(',')));
//              }
//            });
// }
//
// // Takes a list of AdRoll Campaign objects and create an
// // array of csv records.
// const extractAMReportRecords = (campaigns) => {
//   var records = [];
//   campaigns.forEach( c => {
//     c.adgroups.forEach((adGroup) => {
//       adGroup.ads.forEach((ad) => {
//         ad.metrics.byDate.forEach((m) => {
//           records.push(
//             [
//               m.date,
//               (new Date(m.date)).toLocaleString('en-us', {weekday: 'long'}),
//               c.type || "",
//               c.channel || "",
//               c.name,
//               adGroup.name,
//               ad.status,
//               ad.name,
//               ad.width + "x" + ad.height,
//               ad.type,
//               m.cost,
//               m.impressions,
//               m.clicks,
//               m.viewThroughs || "",
//               m.clickThroughs || "",
//               m.viewRevenue || "",
//               m.clickRevenue || ""
//             ].join()
//           );
//         });
//       });
//     });
//   });
//   return records;
// }
//
// const getReportRecordsPromise = (inputs, graphQLClient) => {
//   const csvHeaders = [
//     "date",
//     "day_of_week",
//     "product",
//     "inventory_source",
//     "campaign",
//     "adgroup",
//     "status",
//     "ad",
//     "ad_size",
//     "type",
//     "cost",
//     "impressions",
//     "clicks",
//     "adjusted_total_conversions",
//     "adjusted_ctc",
//     "adjusted_vtc",
//     "attributed_rev",
//     "attributed_click_through_rev",
//     "attributed_view_through_rev"
//   ].join(",");
//
//   const query = `{
//     advertisable {
//       byEID(advertisable: $advertasibleEID) {
//         eid
//         name
//         campaigns {
//           name
//           adgroups {
//             name
//             ads {
//               name
//               status
//               type
//               height
//               width
//               adFormatName
//               metrics(start: $startDate, end: $endDate, currency: "USD") {
//                 byDate {
//                   impressions
//                   clicks
//                   cost
//                   viewThroughs
//                   clickThroughs
//                   viewRevenue
//                   clickRevenue
//                   date
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   }`;
//   const variables = {
//     advertasibleEID: inputs.advertasibleEID,
//     startDate: inputs.dateRange.start.toISOString().slice(0,10),
//     endDate: inputs.dateRange.end.toISOString().slice(0,10)
//   }
//
//   return client.request(query, variables)
//            .then((data) => {
//                return {
//                  records: [csvHeaders].concat(extractAMReportRecords(data.advertisable.byEID.campaigns))
//                };
//            })
//            .catch((response) => {
//              var message = "Getting data from the AdRoll API failed. Here is what I got back: " +
//                  JSON.stringify(response.response.errors);
//              throw new Error(message);
//            });
// }
//
// const buildGraphQLClient = (apiKey, oauth2Token) => {
//   const endpoint  = 'https://services.adroll.com/reporting/api/v1/query?apikey=' + apiKey;
//   // const authHeaderValue = "Bearer " + oauth2Token;
//   const authHeaderValue = "Basic bUBlbGxpcHNpcy5haTphNCZVWiM2ZmZa";
//   return new graphqlRequest.GraphQLClient(endpoint, {
//     headers: { Authorization: authHeaderValue }
//   })
//
// }
