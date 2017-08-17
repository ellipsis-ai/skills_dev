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
  timeZone: "America/Log_Angeles"
});


// -----------------------------------------------------------------------------
// Action
// -----------------------------------------------------------------------------
const graphqlRequest = require('graphql-request');
const dateRangeParser = require('ellipsis-date-range-parser');
const Q = require('q');

const validateAdRollAPIisReacheable = (graphQLClient) => {
  const query = `query { organization { current { name } } }`;
  return graphQLClient.request(query)
            .then((data) => {
              return {
                apiOK: true
              };
            })
            .catch((response) => {
                var errors = [];
                if (response.name === 'FetchError') {
                  // API is unreacheable
                  errors.push(response.message);
                } else {
                  errors.concat(response.response.errors);
                }
                return {
                    errors: errors
                  };
            });
}

const validateAdvertasibleEIDPromise = (advertasibleEID, graphQLClient) => {
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
            .then((data) => {
              return {
                value: advertasibleEID
              };
            })
            .catch((response) => {
                var errors = [];
                if (response.name === 'FetchError') {
                  // API is unreacheable
                  errors.push(response.message);
                } else {
                  errors.concat(response.response.errors);
                }
                return {
                    value: advertasibleEID,
                    errors: errors
                  };
            });
}

const validateDateRange = (dateRange) => {
  if (dateRange.start < dateRange.end) {
    return true;
  } else {
    return false;
  }
}

const validateInputsPromise = (inputs, options) => {
  return validateAdvertasibleEIDPromise(inputs.advertasibleEID, options.graphQLClient)
           .then((result) => {
             const dateRangeValidation = validateDateRange(inputs.dateRange);
             const validationResult = {
               advertasibleEID: result,
               dateRange: dateRangeValidation
             }
             return validationResult;
           });
}

// Takes a list of AdRoll Campaign objects and create an
// array of csv records.
const extractAMReportRecords = (campaigns) => {
  var records = [];
  campaigns.map( c => {
    for (let adGroup of c.adgroups) {
      for (let ad of adGroup.ads) {
        for (let m of ad.metrics.byDate) {
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
        }
      }
    }
  });
  return records;
}

const getReportRecordsPromise = (inputs, graphQLClient) => {
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
  }

  return client.request(query, variables)
           .then((data) => {
               return {
                 records: [csvHeaders].concat(extractAMReportRecords(data.advertisable.byEID.campaigns))
               };
           })
           .catch((response) => {
             return {
               errors: response.response.errors
             };
           });
}

const buildGraphQLClient = (apiKey, oauth2Token) => {
  const endpoint  = 'https://services.adroll.com/reporting/api/v1/query?apikey=' + apiKey;
  // const authHeaderValue = "Bearer " + oauth2Token;
  const authHeaderValue = "Basic bUBlbGxpcHNpcy5haTphNCZVWiM2ZmZa";
  return new graphqlRequest.GraphQLClient(endpoint, {
    headers: { Authorization: authHeaderValue }
  })

}


// Fake Action inputs here:
const dateRange = "wtd";
const advertasibleEID = "I7ORHTOOXJGB3CH3PN46Z6";


// -----------------------------------------------------------------------------
//   Main begins Here
// -----------------------------------------------------------------------------

const parsedRange = dateRangeParser.parse(dateRange, ellipsis.teamInfo.timeZone);
const client = buildGraphQLClient(ellipsis.env.ADROLL_API_KEY, ellipsis.accessTokens.adRollApp);
const inputs = {
  advertasibleEID: advertasibleEID,
  dateRange: parsedRange
};
const options = {
  graphQLClient: client
};

validateAdRollAPIisReacheable(client)
  .then((result) => {
    if (result.errors) {
      ellipsis.error(
        "Cannot reach the AdRoll API. Maybe it is offline. "
        + " Here is the error I am getting:"
        + JSON.stringify(result.errors)
      );
    }
    return validateInputsPromise(inputs, options)
  })
  .then( (result) => {
    if (result.advertasibleEID.errors) {
      ellipsis.error(
        "The advertasibleEID '"+ advertasibleEID +"' is invalid. "
        + " We got the following error from the AdRoll API when validating the advertasibleEID:"
        + JSON.stringify(result.advertasibleEID.errors)
      );
    } else if (result.dateRange.errors) {
      ellipsis.error("The date range " + dateRange + " is invalid. Please fix it and try again");
    }
  })
  // Get the report date from the AdRoll API
  .then( () => {
    return getReportRecordsPromise(inputs, client);
  })
  // Creates a CSV file to send to the user
  .then(result => {
    if (result.errors) {
      ellipsis.error(
        "Getting data from the AdRoll API failed. Here is what I got back: "
        + JSON.stringify(result.errors)
      );
    }
    const reportType = "AM";
    const start = inputs.dateRange.start.toISOString().slice(0,10);
    const end = inputs.dateRange.end.toISOString().slice(0,10);
    const filename = ["report", reportType, start, end].join("_") + ".csv";
    const files = [{
      content: result.records.join('\n'),
      filetype: "csv",
      filename: filename
    }];
    ellipsis.success("Here is your report", { files: files });
});
