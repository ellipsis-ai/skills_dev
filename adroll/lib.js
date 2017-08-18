const AdrollError = require('./adroll_error');
const graphqlRequest = require('graphql-request');
const Q = require('q');

const AdrollLib = {
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
        throw new AdrollError("API_ERROR", "Cannot reach the AdRoll API. Maybe it is offline.", errors);
      });
  },

  validateAdvertasibleEIDPromise: function(advertasibleEID, graphQLClient) {
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
          throw new AdrollError("EID_ERROR", `The EID ${advertasibleEID} is invalid.`, errors);
      });
  },

  validateDateRange: function(dateRange) {
    return new Promise((resolve, reject) => {
      if (!dateRange) {
        reject(new AdrollError("DATE_RANGE_ERROR", `The date range "${dateRange}" is invalid`, ["No valid date range"]));
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
        reject(new AdrollError("DATE_RANGE_ERROR", `The date range "${dateRange}" is invalid`, errors));
      }

      resolve();
    });
  },

  // Takes a list of AdRoll Campaign objects and create an
  // array of csv records.
  extractAMReportRecords: function(campaigns) {
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
  }

  getReportQuery: function() {
    return `{
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
  },

  getReportRecordsPromise: function(inputs, graphQLClient) {
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

    const query = getReportQuery();
    const variables = {
      advertasibleEID: inputs.advertasibleEID,
      startDate: inputs.dateRange.start.toISOString().slice(0,10),
      endDate: inputs.dateRange.end.toISOString().slice(0,10)
    };

    return client.request(query, variables)
      .then((data) => {
         return {
           records: [csvHeaders].concat(AdrollLib.extractAMReportRecords(data.advertisable.byEID.campaigns))
         };
      })
      .catch((response) => {
        return new AdrollError("REPORT_ERROR", "An error occurred fetching the report", response.response.errors);
      });
  },

  buildGraphQLClient: function(apiKey, oauth2Token) {
    const endpoint  = 'https://services.adroll.com/reporting/api/v1/query?apikey=' + apiKey;
    // const authHeaderValue = "Bearer " + oauth2Token;
    const authHeaderValue = "Basic bUBlbGxpcHNpcy5haTphNCZVWiM2ZmZa";
    return new graphqlRequest.GraphQLClient(endpoint, {
      headers: { Authorization: authHeaderValue }
    });
  }

};

module.exports = AdrollLib;
