const { validEmailsUniversityNested } = require("../DataLists/emails");
const { timeTags } = require("../DataLists/generalTagsList");

// filter with university communities
const buildEventFilterCommunities = (userObj, selectedTags = []) => {
  const emailEnding = "@" + userObj.email.split("@")[1];
  let filterList = getUserForCommunities(userObj);

  // validEmailsUniversityNested format => [[email1, email2, ...],[],[]]
  for (var i = 0; i < validEmailsUniversityNested.length; i++) {
    //
    // loop through community
    for (var j = 0; j < validEmailsUniversityNested[i].length; j++) {
      // if community is mine or one of my inviters
      if (
        validEmailsUniversityNested[i][j].includes(emailEnding) ||
        userObj.ancestorComunities.includes(validEmailsUniversityNested[i][j])
      ) {
        // adding community emails to list
        for (var k = 0; k < validEmailsUniversityNested[i].length; k++) {
          if (!filterList.includes(validEmailsUniversityNested[i][k])) {
            filterList.push(validEmailsUniversityNested[i][k]);
          }
        }
        j = validEmailsUniversityNested[i].length;
      }
    }
    // ending j loop
  }
  // ending i loop

  if (userObj.role == "admin") {
    filterList.push("pendingUser");
  }

  let filter;
  // filter with tags
  if (selectedTags?.length > 0) {
    //general filter
    filter = {
      $and: [
        { forCommunities: { $in: filterList } },
        { isOld: false },
        { displayOnHomeScreen: true },
        { privacy: { $ne: "private-event-invitation" } },
      ],
    };
    // adding tags to filter

    let generalTagsList = [];
    selectedTags?.forEach((element) => {
      if (!timeTags.includes(element)) {
        generalTagsList.push(element);
      }
    });
    if (generalTagsList.length > 0) {
      filter["$and"].push({ tags: { $in: generalTagsList } });
    }

    let timeTagsList = [];
    selectedTags.forEach((element) => {
      if (timeTags.includes(element)) {
        timeTagsList.push(element);
      }
    });
    if (timeTagsList.length > 0) {
      filter["$and"].push({ tags: { $in: timeTagsList } });
    }
  }
  // filter without tags
  else {
    filter = {
      forCommunities: { $in: filterList },
      isOld: false,
      displayOnHomeScreen: true,
      privacy: { $ne: "private-event-invitation" },
    };
  }

  return filter;
};

const getUserForCommunities = (userObj) => {
  const emailEnding = "@" + userObj.email.split("@")[1];
  let forCommunities = [];

  // validEmailsUniversityNested format => [[email1, email2, ...],[],[]]
  for (var i = 0; i < validEmailsUniversityNested.length; i++) {
    //
    // loop through community
    for (var j = 0; j < validEmailsUniversityNested[i].length; j++) {
      // if community is mine or one of my inviters
      if (
        validEmailsUniversityNested[i][j].includes(emailEnding) ||
        userObj.ancestorComunities.includes(validEmailsUniversityNested[i][j])
      ) {
        // adding community emails to list
        for (var k = 0; k < validEmailsUniversityNested[i].length; k++) {
          if (!forCommunities.includes(validEmailsUniversityNested[i][k])) {
            forCommunities.push(validEmailsUniversityNested[i][k]);
          }
        }
        j = validEmailsUniversityNested[i].length;
      }
    }
    // ending j loop
  }
  return forCommunities;
};

module.exports = { buildEventFilterCommunities, getUserForCommunities };
