declare module 'expo-constants' {
  const Constants: {
    expoConfig?: { extra?: { eas?: { projectId?: string } } };
    deviceId?: string;
  };
  export default Constants;
}
