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


// -----------------------------------------------------------------------------
// Fake Action inputs here:
// -----------------------------------------------------------------------------
const dateRange = "wtd";
const advertasibleEID = "I7ORHTOOXJGB3CH3PN46Z6";


// -----------------------------------------------------------------------------
// Action
// -----------------------------------------------------------------------------
const AdRollError = require('./adroll_error');
const AdRoll = require('./adroll');
const dateRangeParser = require('ellipsis-date-range-parser');

const parsedRange = dateRangeParser.parse(dateRange, ellipsis.teamInfo.timeZone);
const client = AdRoll.buildGraphQLClient(ellipsis.env.ADROLL_API_KEY, ellipsis.accessTokens.adRollApp);
const inputs = {
  advertasibleEID: advertasibleEID,
  dateRange: parsedRange
};

AdRoll.validateAdRollAPIisReacheable(client)
  .then(() => {
    return AdRoll.validateAdvertasibleEID(advertasibleEID, client)
  })
  .then(() => {
    // dateRange is what the user input
    return AdRoll.validateDateRange(parsedRange, dateRange)
  })
  .then(() => {
    return AdRoll.getReportRecords(inputs, client);
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
    return files;
})
.then((files) => {
  ellipsis.success("Here is your report", { files: files });
})
.catch((error) => {
   ellipsis.error(error.message);
});
