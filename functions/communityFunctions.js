const { stanfordEmails, developerEmails } = require("../DataLists/emails");

const getUserCommunityName = (user) => {
  try {
    let communityName = "other";

    const possibleCommunities = [
      `@${user?.email?.split?.("@")?.[1]}`,
      ...user.ancestorComunities,
    ];

    possibleCommunities.forEach((email) => {
      if (communityName == "other") {
        if (stanfordEmails.includes(email)) {
          communityName = "stanford";
        }
        //
        else if (developerEmails.includes(email)) {
          communityName = "test";
        }
      }
    });

    return communityName;
  } catch (error) {
    console.log("Error adiguatfg6adtf76 ", error);
    return "other";
  }
};

module.exports = { getUserCommunityName };
