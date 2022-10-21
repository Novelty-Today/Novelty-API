const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const { baseUrl, MY_SECRET_KEY, servicesBaseUrl } = require("../constants");
const jwt = require("jsonwebtoken");
const { getDynamicLink } = require("./dynamicLinkFunctions");

const generateDynamicLinkForInvitation = (
  eventId,
  dateIdentifier,
  type = "addCoHost",
  email = null,
  phone = null
) => {
  return Event.findById(eventId)
    .then((event) => {
      const token = jwt.sign(
        { type, eventId, dateIdentifier, email, phone },
        MY_SECRET_KEY
      );

      const body = getDynamicLinkBodyForEvent(
        `token=${token}`,
        event.name,
        event.description,
        event.mediaArray[0]
      );

      const httpsData = new TextEncoder().encode(JSON.stringify(body));
      const options = getHttpsRequestOptions(httpsData);

      return getDynamicLink(httpsData, options);
    })
    .then((link) => {
      return link;
    })
    .catch((error) => {
      console.log("Error daiutby ", error);
      return null;
    });
};

const getDynamicLinkBodyForEvent = (
  query,
  previewTitle,
  previewDescription,
  socialImageLink
) => {
  return {
    dynamicLinkInfo: {
      domainUriPrefix: servicesBaseUrl,
      link: `${baseUrl}toNoveltyApp?${query}`,
      androidInfo: {
        androidPackageName: "com.test.novelty",
        androidMinPackageVersionCode: "6",
      },
      iosInfo: {
        iosBundleId: "org.novelty.today",
        iosAppStoreId: "1563260378",
        //  minimumVersion: "1.1",
      },
      navigationInfo: { enableForcedRedirect: true },
      socialMetaTagInfo: {
        socialTitle: previewTitle,
        socialDescription: previewDescription,
        socialImageLink: socialImageLink,
      },
    },
    suffix: {
      option: "UNGUESSABLE",
    },
  };
};

const getHttpsRequestOptions = (httpsData) => {
  const webApiKey = "AIzaSyCOkp-2PFw-4-noBADqC-mPA7VVCgFZKhI";

  return {
    host: "firebasedynamiclinks.googleapis.com",
    path: `/v1/shortLinks?key=${webApiKey}`,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": httpsData.length,
    },
    method: "POST",
  };
};

module.exports = {
  generateDynamicLinkForInvitation,
};
