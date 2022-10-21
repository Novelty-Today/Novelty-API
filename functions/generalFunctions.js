const fetch = require("node-fetch");
const { googleDirectionsApiKey } = require("../constants");
const { mongoFindOne } = require("./mongodbDriver");
const { interestsList } = require("../DataLists/interestsList");

const decode = (t, e) => {
  for (
    var n,
      o,
      u = 0,
      l = 0,
      r = 0,
      d = [],
      h = 0,
      i = 0,
      a = null,
      c = Math.pow(10, e || 5);
    u < t.length;

  ) {
    (a = null), (h = 0), (i = 0);
    do (a = t.charCodeAt(u++) - 63), (i |= (31 & a) << h), (h += 5);
    while (a >= 32);
    (n = 1 & i ? ~(i >> 1) : i >> 1), (h = i = 0);
    do (a = t.charCodeAt(u++) - 63), (i |= (31 & a) << h), (h += 5);
    while (a >= 32);
    (o = 1 & i ? ~(i >> 1) : i >> 1),
      (l += n),
      (r += o),
      d.push([l / c, r / c]);
  }
  return (d = d.map(function (t) {
    return { latitude: t[0], longitude: t[1] };
  }));
};

const getDrivingPolyline = (lat1, lon1, lat2, lon2) => {
  const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat1},${lon1}&destination=${lat2},${lon2}&key=${googleDirectionsApiKey}`;

  return fetch(apiUrl)
    .then((value) => value.json())
    .then((json) => {
      let polyline = [];

      if (json.routes.length > 0) {
        json.routes[0].legs[0].steps.forEach((element) => {
          polyline.push(...decode(element.polyline.points));
        });
      }

      return polyline;
    })
    .catch((error) => {
      console.log("Error &^&7edfsihfsy%*% ", error);
      return [];
    });
};

// radius is in meters
const getNearbyPlaces = (lat, long, text, radius = 50000) => {
  let apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?key=${googleDirectionsApiKey}&radius=${radius}&query=${text}`;
  if (lat && long) {
    apiUrl += `&location=${lat},${long}`;
  }

  return fetch(apiUrl)
    .then((value) => value.json())
    .then((json) => {
      const results = json.results;
      results.sort((a, b) => {
        if (Math.abs(a.rating - b.rating) < 0.5) {
          return (
            b.rating * b.user_ratings_total - a.rating * a.user_ratings_total
          );
        } else {
          return b.rating - a.rating;
        }
      });

      // taking first 3 choices
      return results.slice(0, 3).map((result) => {
        return {
          location: result.geometry.location,
          name: result.name,
          rating: result.rating,
          user_ratings_total: result.user_ratings_total,
          address: result.formatted_address,
        };
      });
    })
    .catch((error) => {
      console.log("Error in getNearbyPlaces ", error);
      return [];
    });
};

const getNumbersFromString = (string) => {
  let numString = "";
  for (let i = 0; i < string.length; i++) {
    if (string[i] === "0" || parseInt(string[i])) numString += string[i];
  }

  // it means "string" contained country code also
  if (string[0] == "+") {
    return "+" + numString;
  }

  // adding country code to number (Georgia, +995)
  if (numString.length === 9) {
    numString = "+995" + numString;
  } else if (numString.length === 12) {
    numString = "+" + numString;
  }

  return numString;
};

const getInterests = () => {
  let list = [];

  interestsList.forEach((interestName) => {
    list.push(
      mongoFindOne("interests", { name: interestName })
        .then((interest) => {
          if (interest && interest?.url?.length > 0) {
            return {
              _id: interest._id,
              emoji: interest.emoji,
              name: interest.name,
              url: interest.urls[
                Math.floor(Math.random() * interest.urls.length)
              ],
            };
          } else {
            return interestName;
          }
        })
        .catch((error) => {
          console.log("Error eaifa ", error);
          return interestName;
        })
    );
  });

  return Promise.all(list)
    .then((result) => {
      let finalList = [];
      result.forEach((element) => {
        if (element?._id) {
          finalList.push(element);
        }
      });

      return finalList;
    })
    .catch((err) => {
      console.log("error asfd7923sdasf: ", err);
      return [];
    });
};

const getCustomMessage = (name) => {
  return `Hey${
    name ? " " + name : ""
  }!\n\nGeorgi here. I’m excited for you to start exploring your community!\n\nNow that you’ve finished creating your profile, start exploring novelty. Swipe through the main page to see what’s happening around you. Use your calendar to see what events you have coming up.\n\nWhen you feel like it, try creating your own event!\nIf you have any questions about novelty, chat me here.\n\nCheers to growing.\nGeorgi, Founder of Novelty.`;
};

const getRegex = (text) => {
  let finalText = text;
  if (finalText.length > 100) {
    return new RegExp("");
  }

  const removesLastChar = () => {
    if (finalText[finalText.length - 1] == "\\") {
      finalText = finalText.slice(0, -1);
      return removesLastChar();
    }
  };

  removesLastChar();

  return new RegExp(finalText, "i");
};

const getRandomNumberInRange = (min = 0, max = 10) => {
  return Math.floor(Math.random() * max + min);
};

module.exports = {
  getDrivingPolyline,
  getNearbyPlaces,
  getNumbersFromString,
  getInterests,
  getCustomMessage,
  getRegex,
  getRandomNumberInRange,
};
