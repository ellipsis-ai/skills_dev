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
const dateRange = "asdasda";
const advertasibleEID = "I7ORHTOOXJGB3CH3PN46Z6";
