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

function handleAPIError(response, errorType, message) {
  const errors = [];
  if (response.name === 'FetchError') {
    errors.push(response.message);
  } else {
    response.response.errors.forEach((ea) => errors.push(ea));
  }
  throw new AdRollError(errorType, message, errors);
}

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
        handleAPIError(response, "FETCH_ERROR", "Cannot reach the AdRoll API. Maybe it is offline.");
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
        handleAPIError(response, "EID_ERROR", `The EID ${advertasibleEID} is invalid.`);
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
        handleAPIError(response, "REPORT_ERROR", "An error occurred fetching the report");
      });
  },

  getOrgInfo: function(inputs, graphQLClient) {
      var query = `query { organization { current { name eid } } }`;
      var variables = {};
      if (inputs.organizationEID) {
        query =`{
          organization {
            byEID(organization: $organizationEID) {
              name
              eid
            }
          }
        }`;
        variables = {
          organizationEID: inputs.organizationEID
        };
      }
      return graphQLClient.request(query, variables)
               .then((data) => {
                 return data.organization.byEID || data.organization.current;
               })
               .catch((response) => {
                 var message = "Something is wrong. I cannot connect to the AdRoll API.";
                 if (inputs.organizationEID) {
                   message = `OrganizationEID ${inputs.organizationEID} is invalid.`;
                 }
                 handleAPIError(response, "FETCH_ERROR", message);
               });
  }
};

module.exports = Adroll;
