import { SignUp } from "@clerk/react"

export const SignUpPage = () => {
  return <div style={{ background: "#f5f2ee" }}><SignUp path="/sign-up" routing="path" signInUrl="/sign-in" /></div>
};