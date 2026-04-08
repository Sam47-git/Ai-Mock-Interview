import { Link } from "react-router";

const LogoContainer = () => {
  return (
    <Link to={"/"}>
        <img 
            src="/assets/svg/logo.svg" 
            alt="" 
            className="min-w-[40px] max-h-[40px] rounded-full" />
    </Link>
  );
};

export default LogoContainer;