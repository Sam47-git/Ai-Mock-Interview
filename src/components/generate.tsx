import { Outlet } from "react-router";

const Generate = () => {
  return (
    <div className="flex-col md:px-12">
        <Outlet />    
    </div>
  );
};

export default Generate;