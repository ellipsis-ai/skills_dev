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
var organizationEID = " ";


// -----------------------------------------------------------------------------
// Action
// -----------------------------------------------------------------------------
organizationEID =  organizationEID.trim();

const AdRollError = require('./adroll_error');
const AdRoll = require('./adroll');

const client = AdRoll.buildGraphQLClient(ellipsis.env.ADROLL_API_KEY, ellipsis.accessTokens.adRollApp);

AdRoll.validateAdRollAPIisReacheable(client)
.then(() => {
  return AdRoll.getOrgInfo({organizationEID: organizationEID}, client);
})
.then((orgInfo) => {
  ellipsis.success(orgInfo);
})
.catch((error) => {
   ellipsis.error(error.message);
});
