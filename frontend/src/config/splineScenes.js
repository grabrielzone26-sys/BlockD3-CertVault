const scenes = {
  ambientAuth: process.env.REACT_APP_SPLINE_AUTH_AMBIENT_URL || '',
  ambientApp: process.env.REACT_APP_SPLINE_APP_AMBIENT_URL || '',
  authHero: process.env.REACT_APP_SPLINE_AUTH_HERO_URL || '',
  publicVerifyHero: process.env.REACT_APP_SPLINE_PUBLIC_VERIFY_HERO_URL || '',
  verifyHero: process.env.REACT_APP_SPLINE_VERIFY_HERO_URL || '',
};

export default scenes;
