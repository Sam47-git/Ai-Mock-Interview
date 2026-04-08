import { useAuth, UserButton } from "@clerk/react";
import { Loader } from "lucide-react";
import { Link } from "react-router-dom";

const ProfileContainer = () => {

  const {isSignedIn, isLoaded} = useAuth();

  if(!isLoaded) {
    return (
      <div className="flex items-center">
        <Loader className="min-w-4 min-h-4 animate-spin text-emerald-500" />
      </div>
    );
  }

  return <div className="flex items-center gap-6">
    {isSignedIn ? (
      <UserButton />
      ) : (
      <Link to="/sign-in" className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-900">
        Get Started
      </Link>
      )}
  </div>
};

export default ProfileContainer;