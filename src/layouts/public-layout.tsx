import Footer from "@/components/footer"
import Header from "@/components/header"
import { Outlet } from "react-router"

export const PublicLayout = () => {
    return (
        <div className="w-full">
            <Header />

            <Outlet />

            <Footer />
        </div>  
    )
}   