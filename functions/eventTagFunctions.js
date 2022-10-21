const levenshtein = require("js-levenshtein");
const { generalTagsList, timeTags } = require("../DataLists/generalTagsList");
const sportsTagList = require("../DataLists/sportsTagList");
const drinksTagList = require("../DataLists/drinksTagList");
const { noLetterOrNumberCharacters } = require("../DataLists/characters");
const { getInterestListLowerCased } = require("../DataLists/interestsList");
const { buildEventFilterCommunities } = require("./filterFunctions");
const { mongoFindSpecificField } = require("./mongodbDriver");

const eventTagsGenerator = (arrayOfStrings) => {
  const tags = [
    ...generalTagsList,
    ...sportsTagList,
    ...drinksTagList,
    ...getInterestListLowerCased(),
  ];
  const commonWords = [];
  const searchWords = [];

  arrayOfStrings.forEach((string) => {
    searchWords.push(...string.split(" "));
  });

  searchWords.forEach((searchWord) => {
    tags.forEach((tag) => {
      if (!commonWords.includes(tag) && tagsMatch(searchWord, tag)) {
        commonWords.push(tag);
      }
    });
  });

  return commonWords;
};

const removeUnnecessaryCharacters = (word) => {
  let cleanedWord = word;
  noLetterOrNumberCharacters.forEach((character) => {
    cleanedWord = cleanedWord.replaceAll(character, "");
  });

  return cleanedWord;
};

const isValidInLevenshtein = (word1, word2) => {
  const wordDistance = levenshtein(word1?.toLowerCase(), word2?.toLowerCase());
  if (
    wordDistance == 0 ||
    (word1.length >= 6 && word2.length >= 6 && wordDistance == 1) ||
    (word1.length >= 9 && word2.length >= 9 && wordDistance == 2)
  ) {
    return true;
  } else {
    return false;
  }
};

const tagsMatch = (word1 = "", word2 = "") => {
  const val = isValidInLevenshtein(removeUnnecessaryCharacters(word1), word2);
  return val;
};

const getMostUsedTags = (user) => {
  let mostUsedTags = [];

  let filter = buildEventFilterCommunities(user);
  filter["tags.0"] = { $exists: true };

  return mongoFindSpecificField("events", filter, { tags: 1, name: 1 })
    .then((result) => {
      let tagRanksingsList = [];
      let tagRankings = {};

      result.forEach((eventTags) => {
        eventTags.tags.forEach((tag) => {
          if (tagRanksingsList.includes(tag)) {
            tagRankings[tag] = tagRankings[tag] + 1;
          } else {
            tagRanksingsList.push(tag);
            tagRankings[tag] = 1;
          }
        });
      });

      tagRanksingsList.sort((a, b) => {
        return tagRankings[b] - tagRankings[a];
      });

      timeTags.forEach((element) => {
        if (tagRanksingsList.includes(element)) {
          mostUsedTags.push(element);
        }
      });

      tagRanksingsList.slice(0, 30).forEach((element) => {
        if (!mostUsedTags.includes(element)) {
          mostUsedTags.push(element);
        }
      });

      return mostUsedTags;
    })
    .catch((error) => {
      console.log("Error ahfgiuy ", error);
      return timeTags;
    });
};

module.exports = { eventTagsGenerator, getMostUsedTags, tagsMatch };
