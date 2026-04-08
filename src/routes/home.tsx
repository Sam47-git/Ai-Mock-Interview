
const HomePage = () => {
  return (
    <main className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-6">
      <div className="max-w-3xl text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to AI Mock Interview</h1>
        <p className="text-lg text-slate-600 mb-6">
          Get started by signing in or exploring the interview features.
        </p>
        <div className="inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white">
          Start your interview journey
        </div>
      </div>
    </main>
  )
};

export default HomePage;