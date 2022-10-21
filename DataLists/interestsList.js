const interestsList = [
  "Crypto",
  "Coffee chat",
  "Investment convo",
  "Lunch",
  "Walk",
  "Web 3.0",
  "Workout",
  "Dinner",
  "Brunch",
  "Hiking",
  "Breakfast",
  "Run together",
  "Watch a movie",
  "Go to the beach",
  "Meditation",
  "Shopping",
  "Play tennis",
  "Surfing",
  "Dancing",
  "Drinks",
  "Play golf",
  "Wine tasting",
  "Beer tasting",
  "Boba tasting",
  "Bbq",
  "Sushi",
  "Play beer pong",
  "Chat about startups",
];

const getInterestListLowerCased = () => {
  let list = [];
  interestsList.forEach((element) => {
    list.push(element.toLocaleLowerCase());
  });
  return list;
};

module.exports = { interestsList, getInterestListLowerCased };
