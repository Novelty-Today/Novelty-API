const getTimedOutVerifiers = (verifiersList) => {
  let timedOutVerifiers = [];

  timedOutVerifiers = verifiersList?.filter?.(
    (verifier) => verifier?.stakeTimedOut
  );

  return timedOutVerifiers;
};

const getVerifiersWithoutTimeOut = (verifiers) => {
  let verifiersWithoutTimeout = [];

  verifiersWithoutTimeout = verifiers?.filter?.(
    (verifier) => !verifier?.stakeTimedOut
  );

  return verifiersWithoutTimeout;
};

const checkAllStakedAnswered = (verifiers = []) => {
  let allAnswered = true;
  verifiers?.forEach((verifier) => {
    if (verifier?.validated == "none") {
      allAnswered = false;
    }
  });

  return allAnswered;
};

const giveTokenText = (action, gainedNoveltyTokens = 0) => {
  if (action == "timeout") {
    return "The time period for the verification is up. We are sorry, but you lost $NC. No worries, there are plenty other events to verify.";
  } else if (action == "wrongAnswer") {
    return "After the review by the novelty community, our verification system detected that your judgement regarding this event was incorrect.\n\nWe know that it sucks to lose your staked coins, but there's plenty of room to earn them back.";
  } else if (action == "correctAnswer") {
    return `Event verified. You received ${gainedNoveltyTokens} $NC.`;
  } else {
    return "";
  }
};

module.exports = {
  getTimedOutVerifiers,
  getVerifiersWithoutTimeOut,
  checkAllStakedAnswered,
  giveTokenText,
};
