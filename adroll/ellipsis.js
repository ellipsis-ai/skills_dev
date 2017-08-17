class Ellipsis {
    constructor() {
      this.env = {};
      this.teamInfo = {};
      this.accessTokens = {};
    }

    setEnv(newEnv) {
      this.env = newEnv;
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
      console.log(JSON.stringify(options));
      process.exit(0);
    }

    error(object){
      console.log("--------------- Error ---------------");
      console.log(object);
      process.exit(-1);
    }
}


module.exports = Ellipsis
