import { cn } from "@/lib/utils";
import { Container } from "./ui/container";
import LogoContainer from "./logo-container";
import NavigationRoutes from "./navigation-routes";
import { NavLink } from "react-router-dom";
import ProfileContainer from "./profile-container";
import ToggleContainer from "./toggle-container";

const Header = () => {
  return (
    <header className={cn("w-full border-b duration-150 transition-all ease-in-out")} style={{ background: "#f5f2ee" }}
    >
      <Container>
        <div className="flex items-center justify-between gap-4 w-full">
          
          {/* logo section */}
          <LogoContainer />

          {/* Navigation section */}
          <nav className="hidden md:flex items-center gap-3 flex-1">
            <NavigationRoutes />
            <NavLink 
              to="/generate" 
              className={({isActive}) => 
                  cn(
                      "text-base text-neutral-600", 
                      isActive && "text-neutral-900 font-semibold"
                  )
              }
            >
              Take an Interview
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-6">
            {/* profile section */}
            <ProfileContainer />

            {/* mobile toggle section */}
            <div className="md:hidden">
              <ToggleContainer />
            </div>
          </div>
        </div>
      </Container>

    </header>
  );
};

export default Header;