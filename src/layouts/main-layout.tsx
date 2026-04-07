import Footer from "@/components/footer"
import Header from "@/components/header"
import { Outlet } from "react-router"

const MainLayout = () => {
    return (
        <div className="flex flex-col h-screen">
            <Header />

            <main className="flex-grow">
                <Outlet />
            </main>

            <Footer />
        </div>  
    );
};

export default MainLayout;
