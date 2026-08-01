import { Alert } from "react-native";

export function showError(title: string, message?: string) {
  Alert.alert(title, message || "Something went wrong. Please try again.");
}

export function showSuccess(title: string, message?: string) {
  Alert.alert(title, message || "Action completed successfully.");
}

export function showNetworkError() {
  Alert.alert(
    "Network Error",
    "Unable to connect to the server. Please check your internet connection and try again."
  );
}

export function showAuthError() {
  Alert.alert(
    "Session Expired",
    "Your session has expired. Please login again."
  );
}

export function handleApiError(error?: string, statusCode?: number) {
  if (statusCode === 0) {
    showNetworkError();
  } else if (statusCode === 401) {
    showAuthError();
  } else {
    showError("Error", error);
  }
}
