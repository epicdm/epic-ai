import { currentUser } from "@clerk/nextjs/server";
import WelcomeSetupScreen from "../welcome-setup";

export default async function SignUpWelcomePage() {
  let name = "there";
  try {
    const user = await currentUser();
    name =
      user?.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : user?.fullName ||
          user?.username ||
          user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
          "there";
  } catch {
    // In UAT bypass mode, currentUser() may throw because clerkMiddleware was skipped
  }
  return <WelcomeSetupScreen name={name} />;
}
