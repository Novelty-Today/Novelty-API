const { getRegex } = require("./generalFunctions");

const getValidUserChats = (user) => {
  return {
    $match: {
      status: "active",
      "messages.0": { $exists: true },
      chatMembers: {
        $elemMatch: { email: user.email, isRemoved: { $ne: true } },
      },
    },
  };
};

const addFirstChatMember = {
  $addFields: {
    firstMember: { $first: "$chatMembers" },
  },
};

const addMemberAndId = (user) => {
  return {
    $addFields: {
      member: {
        $cond: {
          if: { $eq: ["$firstMember.email", user.email] },
          then: { $last: "$chatMembers" },
          else: { $first: "$chatMembers" },
        },
      },
    },
  };
};

const matchWithSearchString = (searchString) => {
  return {
    $addFields: {
      matched: {
        $or: [
          {
            $and: [
              { $eq: ["$type", "private"] },
              {
                $regexMatch: {
                  input: "$member.username",
                  regex: getRegex(searchString),
                },
              },
            ],
          },
          {
            $and: [
              { $eq: ["$type", "group"] },
              {
                $regexMatch: {
                  input: "$eventName",
                  regex: getRegex(searchString),
                },
              },
            ],
          },
        ],
      },
    },
  };
};

const filterMatched = {
  $match: { matched: true },
};

// gets last message time objects
const getMessageTimesForFilter = {
  $addFields: {
    date: {
      $dateFromString: {
        dateString: { $last: "$messages.time" },
      },
    },
  },
};

// sort by last message time
const sortByLastMessage = { $sort: { date: -1 } };

module.exports = {
  filterMatched,
  matchWithSearchString,
  addMemberAndId,
  addFirstChatMember,
  getValidUserChats,
  getMessageTimesForFilter,
  sortByLastMessage,
};
