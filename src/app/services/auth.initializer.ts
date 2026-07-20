import { AuthService } from "./auth.service";

export function authInitializer(authService: AuthService) {
  // We return a function that returns a Promise.
  // Angular will PAUSE here until initializeAuth() finishes (fetching token + permissions).
  return () => authService.initializeAuth();
}