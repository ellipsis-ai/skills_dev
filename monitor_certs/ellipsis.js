var AWS = require('aws-sdk');

class Ellipsis {
    constructor() {
      this.env = {};
      this.teamInfo = {};
      this.accessTokens = {};
      this.AWS = undefined;
    }

    setEnv(newEnv) {
      this.env = newEnv;

      if (this.AWS === undefined || this.AWS === null) {
        this.AWS = AWS;
      }

      if (newEnv.AWS_ACCESS_KEY && newEnv.AWS_SECRET_KEY && newEnv.AWS_REGION) {
        AWS.config.update({
          accessKeyId: newEnv.AWS_ACCESS_KEY,
          secretAccessKey: newEnv.AWS_SECRET_KEY,
          region: newEnv.AWS_REGION
        });
      } else if (newEnv.AWS_PROFILE) {
        process.env['AWS_PROFILE'] = newEnv.AWS_PROFILE;
      }

        if (newEnv.AWS_REGION) {
        AWS.config.update({
          region: newEnv.AWS_REGION
        });
      }

      return this.env;
    }

    setTeamInfo(object) {
      this.teamInfo = object;
      return this.teamInfo;
    }

    setAccessTokens(object) {
      this.accessTokens = object;
      return this.accessTokens;
    }

    success(message, options) {
      console.log("--------------- Success ---------------");
      console.log(message);
      if (options) {
        console.log(JSON.stringify(options));
      }
      console.log("--------------- Success ---------------");
      process.exit(0);
    }

    error(object){
      console.log("--------------- Error ---------------");
      console.log(object);
      console.log("--------------- Error ---------------");
      process.exit(-1);
    }

    noResponse() {
      console.log("--------------- No Response ---------------");
      console.log("--------------- No Response ---------------");
      process.exit(0);
    }
}


module.exports = Ellipsis
