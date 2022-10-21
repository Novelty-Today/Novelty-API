const developerEmails = ["@novelty.today", "@novelty.rocks"];
const developerGmails = [
  "giorgimuxraneli2@gmail.com",
  "giorgimukhraneli2222@gmail.com",
  "kotemukhraneli6@gmail.com",
  "gzirakashvili23@gmail.com",
  "giorgizirakashvili81@gmail.com",
  "tttt@mm.com",
  "giorguna@gmail.com",
];

const developerEmails2 = ["@novelty.star"];

const developerEmails3 = ["@test1"];

const stanfordEmails = [
  "@stanford.edu",
  "@alumni.stanford.edu",
  "@alumni.gsb.stanford.edu",
  "@stanford.com",
  "@cs.stanford.edu",
];
const berkleyEmails = ["@berkeley.edu"];
const ucdavisEmails = ["@ucdavis.edu"];
const uciEmails = ["@uci.edu"];
const ucrEmails = ["@ucr.edu"];
const uclaEmails = ["@ucla.edu"];
const ucsdEmails = ["@ucsd.edu"];
const ucsfEmails = ["@ucsf.edu"];
const uscEmails = ["@usc.edu"];
const ucsbEmails = ["@ucsb.edu"];
const ucscEmails = ["@ucsc.edu"];
const calcoastunivEmails = ["@calcoastuniv.edu"];
const caltechEmails = ["@caltech.edu"];
const callutheranEmails = ["@callutheran.edu"];
const cnuasEmails = ["@cnuas.edu"];
const calstatelaEmails = ["@calstatela.edu"];

const sfsuEmails = ["@sfsu.edu"];
const usfcaEmails = ["@usfca.edu"];

const londonEmails = ["@london.edu"];

/////////////////////////////////////////////////////////////////////////
const usEmails = [
  ...stanfordEmails,
  ...berkleyEmails,
  ...ucdavisEmails,
  ...uciEmails,
  ...ucrEmails,
  ...uclaEmails,
  ...ucsdEmails,
  ...ucsfEmails,
  ...uscEmails,
  ...ucsbEmails,
  ...ucscEmails,
  ...calcoastunivEmails,
  ...caltechEmails,
  ...callutheranEmails,
  ...cnuasEmails,
  ...calstatelaEmails,
  ...sfsuEmails,
  ...usfcaEmails,
];
const usEmailsNested = [
  stanfordEmails,
  berkleyEmails,
  ucdavisEmails,
  uciEmails,
  ucrEmails,
  uclaEmails,
  ucsdEmails,
  ucsfEmails,
  uscEmails,
  ucsbEmails,
  ucscEmails,
  calcoastunivEmails,
  caltechEmails,
  callutheranEmails,
  cnuasEmails,
  calstatelaEmails,
  sfsuEmails,
  usfcaEmails,
];
////////////////////////////////////////////////////////////////////////
const ukEmails = [...londonEmails];
const ukEmailsNested = [londonEmails];

////////////////////////////////////////////////////////////////////////

const validEmails = [
  ...usEmails,
  ...ukEmails,
  ...developerEmails,
  ...developerEmails2,
  ...developerEmails3,
];
const validEmailsCountryNested = [
  usEmails,
  ukEmails,
  developerEmails,
  developerEmails2,
  developerEmails3,
];
const validEmailsUniversityNested = [
  ...usEmailsNested,
  ...ukEmailsNested,
  developerEmails,
  developerEmails2,
  developerEmails3,
];

const testingEmails = [
  "ziraka@novelty.today",
  "ziraka2@novelty.today",
  "nika@novelty.today",
  "mohit@novelty.today",
];

const LIMIT_OF_INVITEES = 5;

module.exports = {
  usEmails,
  ukEmails,
  validEmails,
  validEmailsCountryNested,
  validEmailsUniversityNested,
  testingEmails,
  LIMIT_OF_INVITEES,
  stanfordEmails,
  developerEmails,
  developerGmails,
};
