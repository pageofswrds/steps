// Test-only stub. The real healthkit package pulls in react-native-nitro-modules,
// which throws in the jest/node environment (no native NitroModules binary).
// sync.ts imports healthkit.ts unconditionally, so even fake-source tests hit this
// import chain transitively. jest.config.js maps the package to this stub.
export const AuthorizationRequestStatus = { unknown: 0, shouldRequest: 1, unnecessary: 2 }
export const WorkoutActivityType = { walking: 52, hiking: 24 }

export const getRequestStatusForAuthorization = jest.fn()
export const isHealthDataAvailableAsync = jest.fn()
export const queryStatisticsCollectionForQuantity = jest.fn()
export const queryWorkoutSamples = jest.fn()
export const requestAuthorization = jest.fn()
