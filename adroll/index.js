// -----------------------------------------------------------------------------
// Mocking ellipsis
// -----------------------------------------------------------------------------
const Ellipsis = require('./ellipsis');
const AdrollError = require('./error');
const dateRangeParser = require('ellipsis-date-range-parser');
const AdrollLib = require('./lib');

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

// -----------------------------------------------------------------------------
// Fake Action inputs here:
// -----------------------------------------------------------------------------
const dateRange = "asdasdasdas";
const advertasibleEID = "I7ORHTOOXJGB3CH3PN46Z6";

// -----------------------------------------------------------------------------
// Action
// -----------------------------------------------------------------------------

const parsedRange = dateRangeParser.parse(dateRange, ellipsis.teamInfo.timeZone);
const client = AdrollLib.buildGraphQLClient(ellipsis.env.ADROLL_API_KEY, ellipsis.accessTokens.adRollApp);
const inputs = {
  advertasibleEID: advertasibleEID,
  dateRange: parsedRange
};
const options = {
  graphQLClient: client
};

AdrollLib.validateAdRollAPIisReacheable(client)
  .then((result) => {
    return AdrollLib.validateDateRange(inputs.dateRange);
  })
  .then((result) => {
    return AdrollLib.validateAdvertasibleEIDPromise(inputs.advertasibleEID);
  })
  .then((result) => {
    return AdrollLib.getReportRecordsPromise(inputs, client);
  })
  // Creates a CSV file to send to the user
  .then((result) => {
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
  })
  .catch((err) => {
    if (err instanceof AdrollError) {
      ellipsis.error(
`An error occurred (${err.type}).

${err.message}

Additional information:

- ${err.errors.join("\n- ")}`);
    } else {
      ellipsis.error(`An error occurred:

${require('util').inspect(err)}`);
    }
  });
