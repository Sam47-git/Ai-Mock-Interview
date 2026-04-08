import { SignUp } from "@clerk/react"

export const SignUpPage = () => {
  return <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
};