import { Outlet } from "react-router-dom";

const InterviewLayout = () => {
  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "#f5f2ee" }}
    >
      <main className="w-full max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default InterviewLayout;