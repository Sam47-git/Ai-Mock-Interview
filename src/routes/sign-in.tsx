import { SignIn } from "@clerk/react"

export const SignInPage = () => {
  return <div style={{ background: "#f5f2ee" }}><SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" /></div>
};
