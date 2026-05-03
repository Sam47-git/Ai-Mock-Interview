import { LoaderPage } from "@/routes/loader-page";
import { useAuth, useUser } from "@clerk/react";
import { useEffect, useState } from "react";
import type { User } from "@/types";
import { db } from "@/config/firebase.config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthHandler = () => {
    const { isSignedIn } = useAuth();
    const { user, isLoaded } = useUser();

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storeUserData = async () => {
            if (!isLoaded) return;

            if (isSignedIn && user?.id) {
                setLoading(true);

                try {
                    const userRef = doc(db, "users", user.id);
                    const userSnap = await getDoc(userRef);

                    if (!userSnap.exists()) {
                        const userData: User = {
                            id: user.id,
                            name: user.fullName || user.firstName || "Anonymous",
                            email: user.primaryEmailAddress?.emailAddress || "N/A",
                            imageUrl: user.imageUrl,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                        };

                        await setDoc(userRef, userData);
                    }

                } catch (error) {
                    console.error("Error storing user:", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        storeUserData();
    }, [isSignedIn, user, isLoaded]);

    if (loading) {
        return <LoaderPage />;
    }

    return null;
};

export default AuthHandler;