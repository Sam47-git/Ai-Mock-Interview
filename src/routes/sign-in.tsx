import { SignIn } from "@clerk/react"

export const SignInPage = () => {
  return <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
};
