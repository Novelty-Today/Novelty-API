// create dateObject from our custom date object // getType can be upcoming or past
const addDateObjectForFiltering = (getType) => {
  const maxDate = new Date(8640000000000000);
  // for upcoming we on flexible dates we give value of max date and for pasts we give it one ms
  // flexible date events always should be at the bottom of the list
  // events are sorted by closest date to current date that is why we need to set flexible event dates like that
  onFailValue = getType == "upcoming" ? maxDate : new Date(1);

  return {
    $addFields: {
      date: {
        $dateFromString: {
          dateString: "$dateObject.dateString",
          onNull: maxDate,
          onError: maxDate,
        },
      },
      sortDate: {
        $dateFromString: {
          dateString: {
            $cond: {
              if: { $eq: ["$dateObject.onlyHas", "none"] },
              then: "Flexible",
              else: "$dateObject.dateString",
            },
          },
          onNull: onFailValue,
          onError: onFailValue,
        },
      },
    },
  };
};

module.exports = {
  addDateObjectForFiltering,
};
