import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl">🐾</span>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              OpenClaw
            </h1>
          </div>
          <p className="text-gray-400">
            Sign in to manage your AI agents
          </p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-gray-900 border border-gray-800 shadow-2xl",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              formFieldLabel: "text-gray-300",
              formFieldInput: "bg-gray-800 border-gray-700 text-white",
              formButtonPrimary: "bg-sky-500 hover:bg-sky-600",
              footerActionLink: "text-sky-400 hover:text-sky-300",
              identityPreviewText: "text-white",
              identityPreviewEditButton: "text-sky-400",
            },
          }}
        />
      </div>
    </div>
  );
}
