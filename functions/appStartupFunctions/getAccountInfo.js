const {
  validEmailsUniversityNested,
  LIMIT_OF_INVITEES,
} = require("../../DataLists/emails");
const { mongoFindOne, mongoAggregate } = require("../mongodbDriver");
const { getUserCommunityName } = require("../communityFunctions");

const getAccountInfo = (user) => {
  try {
    let nonStanfordInvitees = 0;
    let promiseArray = [];

    const limit =
      user.email == "koreli@stanford.edu" ||
      user.email.includes("@novelty.today")
        ? 10000
        : LIMIT_OF_INVITEES;

    promiseArray.push(
      mongoFindOne("userconnections", { user: user.email }).then(
        (userConnection) => {
          if (userConnection) {
            userConnection.children.forEach((child) => {
              if (
                !validEmailsUniversityNested[0].includes(
                  `@${child.split("@")[1]}`
                )
              ) {
                nonStanfordInvitees++;
              }
            });
          }
        }
      )
    );

    let notificationCount = 0;
    user.notifications.forEach((element) => {
      if (element.status == "sent" || element.status == "recieved") {
        notificationCount++;
      }
    });

    return Promise.all(promiseArray)
      .then(() => {
        return getMessagesCount(user.email);
      })
      .then((messageCount) => {
        let userData = {
          username: user.username,
          description: user.description,
          interests: user.interests,
          location: user.location,
          email: user.email,
          messageCount: messageCount,
          notificationCount: notificationCount,
          picture: user.miniMedia,
          microPicture: user.microMedia,
          mediaArray: user.mediaArray,
          gender: user.gender,
          name: user.name,
          lastname: user.lastname,
          instagram: user?.socialIntegrations?.find(
            (item) => item.type == "Instagram"
          )?.profileUrl,
          socialIntegrations: user.socialIntegrations,
          userConnection: {
            limitOfInvitees: limit,
            nonStanfordInvitees: nonStanfordInvitees,
          },
          role: user.role,
          zoomConnection: user.zoomConnection,
          crypto: user.crypto,
          community: getUserCommunityName(user),
          major: user.major,
          clubAffiliations: user.clubAffiliations,
          classYear: user.classYear,
        };

        if (user.geometry && user.geometry.coordinates) {
          userData.coordinates = {
            longitude: user.geometry.coordinates[0],
            latitude: user.geometry.coordinates[1],
          };
        }

        return userData;
      })
      .catch((error) => {
        console.log("EEE ", error);
        return {};
      });
  } catch (error) {
    console.log("EEE ", error);
    return {};
  }
};

const getMessagesCount = (email) => {
  return mongoAggregate("chats", [
    {
      $match: {
        messages: { $not: { $size: 0 } },
        chatMembers: {
          $elemMatch: { email: email, isRemoved: { $ne: true } },
        },
        status: "active",
      },
    },
    {
      $addFields: {
        member: "$chatMembers",
      },
    },
    { $unwind: "$member" },
    {
      $match: {
        "member.email": email,
      },
    },
    {
      $addFields: {
        lastMessageSeen: "$member.lastMessageSeen",
      },
    },
    {
      $match: {
        lastMessageSeen: false,
      },
    },
    { $project: { _id: 1 } },
  ])
    .then((result) => {
      return result?.length ?? 0;
    })
    .catch((error) => {
      console.log("Error ogaydg8atdfa  ", error);
      return 0;
    });
};

module.exports = { getAccountInfo };
