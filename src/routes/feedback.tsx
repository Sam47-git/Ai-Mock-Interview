import { db } from "@/config/firebase.config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LoaderPage } from "./loader-page";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { CircleCheck, Star } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useAuth } from "@clerk/react";
import CustomBreadCrumb from "@/components/custom-bread-crumb";
import InterviewPin from "@/components/pin";
import type { Interview, UserAnswer } from "@/types";
import Headings from "@/components/headings";
const Feedback = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<UserAnswer[]>([]);
  const [activeFeed, setActiveFeed] = useState("");
  const { userId } = useAuth();

  useEffect(() => {
    if (!interviewId) navigate("/generate", { replace: true });
  }, [interviewId, navigate]);

  useEffect(() => {
    if (!interviewId) return;

    const fetchInterview = async () => {
      try {
        const interviewDoc = await getDoc(doc(db, "interviews", interviewId));
        if (interviewDoc.exists()) {
          setInterview({ id: interviewDoc.id, ...interviewDoc.data() } as Interview);
        } else {
          navigate("/generate", { replace: true });
        }
      } catch (error) {
        console.log(error);
        toast("Error", {
          description: "Something went wrong. Please try again later..",
        });
      }
    };

    const fetchFeedbacks = async () => {
      try {
        const querySnapRef = query(
          collection(db, "userAnswers"),
          where("userId", "==", userId),
          where("mockIdRef", "==", interviewId)
        );

        const querySnap = await getDocs(querySnapRef);

        const interviewData: UserAnswer[] = querySnap.docs.map((doc) => {
          return { id: doc.id, ...doc.data() } as UserAnswer;
        });

        setFeedbacks(interviewData);
      } catch (error) {
        console.error("fetchFeedbacks error:", error);
        toast("Error", {
          description: "Something went wrong. Please try again later..",
        });
      }
    };

    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchInterview(), fetchFeedbacks()]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [interviewId, userId, navigate]);

  //   calculate the ratings out of 10

  const totalRawScore = useMemo(() => {
    return feedbacks.reduce((acc, feedback) => acc + (feedback.rating ?? 0), 0);
  }, [feedbacks]);

  const overAllRating = useMemo(() => {
    if (feedbacks.length === 0) return "0.0";
    const maxPossible = feedbacks.length * 5;
    return ((totalRawScore / maxPossible) * 10).toFixed(1);
  }, [feedbacks, totalRawScore]);

  const overAllRemark = useMemo(() => {
    if (feedbacks.length === 0) return { label: "N/A", color: "text-gray-500" };
    const maxScore = feedbacks.length * 5;
    const pct = totalRawScore / maxScore;
    if (pct >= 0.8) return { label: "Excellent", color: "text-emerald-600" };
    if (pct >= 0.56) return { label: "Good", color: "text-blue-600" };
    if (pct >= 0.32) return { label: "Needs Improvement", color: "text-yellow-600" };
    return { label: "Poor", color: "text-red-500" };
  }, [feedbacks.length, totalRawScore]);

  if (isLoading) {
    return <LoaderPage className="w-full h-[70vh]" />;
  }

  return (
    <div className="flex flex-col w-full gap-8 py-5">
      <div className="flex items-center justify-between w-full gap-2">
        <CustomBreadCrumb
          breadCrumbPage={"Feedback"}
          breadCrumbItems={[
            { label: "Mock Interviews", link: "/generate" },
            {
              label: `${interview?.position}`,
              link: `/generate/interview/${interview?.id}`,
            },
          ]}
        />
      </div>

      <Headings
        title="Congratulations !"
        description="Your personalized feedback is now available. Dive in to see your strengths, areas for improvement, and tips to help you ace your next interview."
      />

      <div className="flex flex-col gap-1">
        <p className="text-base text-muted-foreground">
          Your overall interview rating :{" "}
          <span className="text-emerald-500 font-semibold text-xl">
            {overAllRating} / 10
          </span>
        </p>
        <p className={`text-sm font-semibold ${overAllRemark.color}`}>
          {overAllRemark.label}
        </p>
      </div>

      {interview && <InterviewPin interview={interview} onMockPage />}

      <Headings title="Interview Feedback" isSubHeading />

      {feedbacks && (
        <Accordion type="single" collapsible className="space-y-6">
          {feedbacks.map((feed) => (
            <AccordionItem
              key={feed.id}
              value={feed.id}
              className="border rounded-lg shadow-md"
            >
              <AccordionTrigger
                onClick={() => setActiveFeed(feed.id)}
                className={cn(
                  "px-5 py-3 flex items-center justify-between text-base rounded-t-lg transition-colors hover:no-underline",
                  activeFeed === feed.id
                    ? "bg-gradient-to-r from-purple-50 to-blue-50"
                    : "hover:bg-gray-50"
                )}
              >
                <span>{feed.question}</span>
              </AccordionTrigger>

              <AccordionContent className="px-5 py-6 bg-white rounded-b-lg space-y-5 shadow-inner">
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-gray-700">
                    <Star className="inline mr-2 text-yellow-400" />
                    Score: {feed.rating ?? 0} / 5
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-3 pl-8">
                    <span>Accuracy <strong>{feed.accuracy ?? 0}</strong>/2</span>
                    <span>·</span>
                    <span>Completeness <strong>{feed.completeness ?? 0}</strong>/2</span>
                    <span>·</span>
                    <span>Clarity <strong>{feed.clarity ?? 0}</strong>/1</span>
                  </div>
                </div>

                <Card className="border-none space-y-3 p-4 bg-green-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <CircleCheck className="mr-2 text-green-600" />
                    Expected Answer
                  </CardTitle>

                  <CardDescription className="font-medium text-gray-700">
                    {feed.correct_ans}
                  </CardDescription>
                </Card>

                <Card className="border-none space-y-3 p-4 bg-yellow-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <CircleCheck className="mr-2 text-yellow-600" />
                    Your Answer
                  </CardTitle>

                  <CardDescription className="font-medium text-gray-700">
                    {feed.user_ans}
                  </CardDescription>
                </Card>

                <Card className="border-none space-y-3 p-4 bg-red-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <CircleCheck className="mr-2 text-red-600" />
                    Feedback
                  </CardTitle>

                  <CardDescription className="font-medium text-gray-700">
                    {feed.feedback}
                  </CardDescription>
                </Card>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};

export default Feedback;    