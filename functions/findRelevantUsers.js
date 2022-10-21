const { validEmailsUniversityNested } = require("../DataLists/emails");
const { tagsMatch } = require("./eventTagFunctions");
const { buildEventFilterCommunities } = require("./filterFunctions");
const { mongoFind } = require("./mongodbDriver");

const listRelevantUserAboutEvent = (event, user, forCommunities) => {
  let orFilter = getEmailRegexFilter(forCommunities);
  orFilter.push({ interests: { $in: event.tags } });

  if (user.role == "pendingUser") {
    orFilter.push({ role: "admin" });
  }

  return Promise.all([
    getFriendsEmailList(event.organiser),
    mongoFind("users", {
      $and: [
        {
          $or: orFilter,
        },
        { email: { $ne: event.organiser } },
      ],
    }),
    mongoFind("events", buildEventFilterCommunities(user)),
  ])
    .then(([friendsList, interestedUsers, similarEvents]) => {
      let rankedUsersList = [];
      let userRankings = {};

      // interests points
      addInterestPoints(interestedUsers, rankedUsersList, userRankings, event);

      // friendship points
      addFriendshipPoints(friendsList, rankedUsersList, userRankings);

      // attended similar event points
      addSimilarEventAttendancePoints(
        similarEvents,
        rankedUsersList,
        userRankings,
        user.email
      );

      // sort
      rankedUsersList.sort((a, b) => {
        return userRankings[b] - userRankings[a];
      });

      return rankedUsersList.slice(0, 10);
    })
    .catch((error) => {
      console.log("Error aoifuaitfa8tf ", error);
      return [];
    });
};

const addSimilarEventAttendancePoints = (
  similarEvents,
  rankedUsersList,
  userRankings,
  organiser
) => {
  try {
    similarEvents.forEach((event) => {
      event.guests.forEach((guest) => {
        if (guest.email != organiser) {
          if (rankedUsersList.includes(guest.email)) {
            userRankings[guest.email] += 2;
          } else {
            rankedUsersList.push(guest.email);
            userRankings[guest.email] = 2;
          }
        }
      });
    });
  } catch (error) {
    console.log("Error afbgayg ", error);
  }
};

const addFriendshipPoints = (friendsList, rankedUsersList, userRankings) => {
  try {
    friendsList?.forEach((friendEmail) => {
      if (rankedUsersList.includes(friendEmail)) {
        userRankings[friendEmail] += 2;
      } else {
        rankedUsersList.push(friendEmail);
        userRankings[friendEmail] = 2;
      }
    });
  } catch (error) {
    console.log("Error afb3434gayg ", error);
  }
};

const addInterestPoints = (
  interestedUsers,
  rankedUsersList,
  userRankings,
  event
) => {
  try {
    interestedUsers?.forEach((user) => {
      let tagsMatched = 0;
      event.tags?.forEach((tag1) => {
        user?.interests?.forEach((tag2) => {
          if (tagsMatch(tag1, tag2)) {
            tagsMatched++;
          }
        });
      });
      rankedUsersList.push(user.email);
      userRankings[user.email] = tagsMatched;
    });
  } catch (error) {
    console.log("Error UT&^% ", error);
  }
};

const getFriendsEmailList = (email) => {
  mongoFind("friendships", { friends: email })
    .then((friendships) => {
      let friendsList = [];

      friendships.forEach((friendship) => {
        friendsList.push(
          friendship.friends[friendship.friends[0] == email ? 1 : 0]
        );
      });

      return friendsList;
    })
    .catch((error) => {
      console.log("Error aidfuaghyt ", error);
      return [];
    });
};

const getEmailRegexFilter = (forCommunities) => {
  try {
    let orFilter = [];

    const findCommonElements = (arr1, arr2) => {
      return arr1.some((item) => arr2.includes(item));
    };

    validEmailsUniversityNested.forEach((universityEmails) => {
      if (findCommonElements(universityEmails, forCommunities)) {
        universityEmails.forEach((uniEmail) => {
          orFilter.push({ email: new RegExp(uniEmail + "$") });
        });
      }
    });
    return orFilter;
  } catch (error) {
    console.log("Error ausya87bfbgayg ", error);
    return [];
  }
};

module.exports = { listRelevantUserAboutEvent };
