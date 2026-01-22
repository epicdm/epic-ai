import { currentUser } from "@clerk/nextjs/server";
import WelcomeSetupScreen from "../../welcome-setup";

export default async function WelcomeCustomPage() {
  const user = await currentUser();
  const name =
    user?.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : user?.fullName ||
        user?.username ||
        user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        "there";

  return (
    <WelcomeSetupScreen
      name={name}
      cta={{
        title: "Great! Let's build your custom agent",
        description:
          "Our guided wizard will walk you through every step so you can tailor the agent to your business.",
        buttonLabel: "Start Custom Setup",
        buttonHref: "/setup",
      }}
    />
  );
}
