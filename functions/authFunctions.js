// return step where user should start or false
const shouldUserSeeOnboarding = (user) => {
  // start onboarding from first screen where we put username
  if (!user?.username || user?.username == "") {
    return true;
  }
  //
  else {
    return false;
  }
};

module.exports = { shouldUserSeeOnboarding };
