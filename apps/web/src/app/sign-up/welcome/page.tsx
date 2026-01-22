import { currentUser } from "@clerk/nextjs/server";
import WelcomeSetupScreen from "../welcome-setup";

export default async function SignUpWelcomePage() {
  const user = await currentUser();
  const name =
    user?.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : user?.fullName ||
        user?.username ||
        user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        "there";
  return <WelcomeSetupScreen name={name} />;
}
