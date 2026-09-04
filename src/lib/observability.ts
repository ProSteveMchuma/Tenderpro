export function publicErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (process.env.NODE_ENV !== "production" && error instanceof Error && error.message) {
    return error.message;
  }
  if (error instanceof Error) {
    if (
      error.name === "EntitlementError" ||
      error.name === "SubscriptionError" ||
      error.name === "ForbiddenError" ||
      error.name === "UnauthorizedError"
    ) {
      return error.message;
    }
  }
  return fallback;
}

export function logError(scope: string, error: unknown) {
  console.error(`[${scope}]`, error);
}
