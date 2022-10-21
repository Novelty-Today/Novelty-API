const https = require("https");
const { baseUrl, servicesBaseUrl } = require("../constants");

const getDynamicLink = (httpsData, options) => {
  return new Promise((resolve, reject) => {
    let finalData = [];

    const reqHttps = https.request(options, (res) => {
      res.on("data", (data) => {
        finalData.push(data);
      });

      res.on("end", () => {
        resolve(JSON.parse(finalData.toString("utf8")).shortLink);
      });
    });

    reqHttps.on("error", (error) => {
      console.error(error);
      reject(error);
    });

    reqHttps.write(httpsData);
    reqHttps.end();
  });
};

const getDynamicLinkBody = (
  query,
  enableForcedRedirect = true,
  title = "novelty.today",
  description = "",
  image = `${baseUrl}getLogo`
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
      },
      navigationInfo: { enableForcedRedirect: enableForcedRedirect },
      socialMetaTagInfo: {
        socialTitle: title,
        socialDescription: description,
        socialImageLink: image,
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

const getDynamicLinkFromData = (
  type = "",
  data = "",
  enableForcedRedirect,
  title,
  description,
  image
) => {
  const body = getDynamicLinkBody(
    `${type}=${data}`,
    enableForcedRedirect,
    title,
    description,
    image
  );
  const httpsData = new TextEncoder().encode(JSON.stringify(body));
  const options = getHttpsRequestOptions(httpsData);

  return getDynamicLink(httpsData, options).catch((error) => {
    console.log("Error dguitad67fa ", error);
    return null;
  });
};

const parseDynamicLink = (link = "") => {
  try {
    let params = {};

    link?.split?.(",")?.forEach?.((element) => {
      let key = element?.split?.(":")?.[0];
      let value = element?.split?.(":")?.[1];
      params[key] = value;
    });

    return params;
  } catch (error) {
    console.log("Error adigyat ", error);
    return {};
  }
};

module.exports = {
  getDynamicLink,
  getDynamicLinkBody,
  getHttpsRequestOptions,
  getDynamicLinkFromData,
  parseDynamicLink,
};
