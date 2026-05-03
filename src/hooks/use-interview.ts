import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import type { Interview } from "@/types";

export function useInterview(interviewId: string | undefined) {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!interviewId) {
      navigate("/generate", { replace: true });
      return;
    }

    setIsLoading(true);
    const fetchInterview = async () => {
      try {
        const interviewDoc = await getDoc(doc(db, "interviews", interviewId));
        if (interviewDoc.exists()) {
          setInterview({
            id: interviewDoc.id,
            ...interviewDoc.data(),
          } as Interview);
        } else {
          navigate("/generate", { replace: true });
        }
      } catch (error) {
        console.log(error);
        navigate("/generate", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterview();
  }, [interviewId, navigate]);

  return { interview, isLoading };
}
