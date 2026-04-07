import { Outlet } from "react-router";

const AuthenticationLayout = () => {
  return (
    <div className="w-full h-screen overflow-hidden flex items-center justify-center relative">
        <img src="/assets/img/bg.png" className="absolute w-full h-full
        object-cover opacity-25" alt="" />
         <Outlet />
    </div> 
  )
}

export default AuthenticationLayout;