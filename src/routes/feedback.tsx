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
    if (pct >= 0.8)  return { label: "Excellent",          color: "text-emerald-600" };
    if (pct >= 0.56) return { label: "Good",               color: "text-blue-600"    };
    if (pct >= 0.32) return { label: "Needs Improvement",  color: "text-yellow-600"  };
    return               { label: "Poor",              color: "text-red-500"     };
  }, [feedbacks.length, totalRawScore]);

  if (isLoading) {
    return <LoaderPage className="w-full h-[70vh]" />;
  }

  // Bug 7 fix: removed hardcoded inline style={{ background: "#f5f2ee" }}
  // and replaced with a Tailwind class so theming is not bypassed
  return (
    <div className="flex flex-col w-full gap-8 py-5 bg-[#f5f2ee]">
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

      {feedbacks.length > 0 && (() => {
        const ratingPct       = Math.round((feedbacks.reduce((a, f) => a + (f.rating ?? 0), 0) / (feedbacks.length * 5)) * 100);
        const accuracyPct     = Math.round((feedbacks.reduce((a, f) => a + (f.accuracy ?? 0), 0) / (feedbacks.length * 2)) * 100);
        const completenessPct = Math.round((feedbacks.reduce((a, f) => a + (f.completeness ?? 0), 0) / (feedbacks.length * 2)) * 100);
        // Bug 6 fix: removed meaningless * 1; clarity max per question is 1,
        // so dividing by feedbacks.length alone is correct and consistent
        const clarityPct      = Math.round((feedbacks.reduce((a, f) => a + (f.clarity ?? 0), 0) / feedbacks.length) * 100);

        const sorted = [...feedbacks].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        const best   = sorted[0];
        const worst  = sorted[sorted.length - 1];

        const bars = [
          { label: "Overall Rating",  pct: ratingPct,       color: "#4caf7d" },
          { label: "Accuracy",        pct: accuracyPct,     color: "#f0a882" },
          { label: "Completeness",    pct: completenessPct, color: "#7b6ef6" },
          { label: "Clarity",         pct: clarityPct,      color: "#c8502a" },
        ];

        const remarkColor =
          ratingPct >= 80 ? "#4caf7d" :
          ratingPct >= 56 ? "#7b6ef6" :
          ratingPct >= 32 ? "#f0a882" : "#f87171";

        return (
          <div style={{
            background: "#1a1a1a",
            borderRadius: "20px",
            padding: "1.75rem",
            border: "1px solid #2a2a2a",
            width: "100%",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Session Report
                </div>
                <div style={{ fontSize: "0.82rem", color: remarkColor, fontWeight: 600, marginTop: "2px" }}>
                  {overAllRemark.label}
                </div>
              </div>
              <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.4rem", color: "#f0a882", lineHeight: 1 }}>
                {overAllRating}
                <span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.25)", marginLeft: "3px" }}>/10</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                {bars.map(({ label, pct, color }) => (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>
                      <span>{label}</span>
                      <span style={{ color: pct > 0 ? color : "rgba(255,255,255,0.25)" }}>
                        {pct > 0 ? `${pct}%` : "—"}
                      </span>
                    </div>
                    <div style={{ height: "7px", background: "#2a2a2a", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        borderRadius: "4px",
                        background: pct > 0 ? color : "#2a2a2a",
                        width: `${pct}%`,
                        transition: "width 1.2s ease",
                        minWidth: pct > 0 ? "6px" : "0",
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ background: "rgba(76,175,125,0.1)", border: "1px solid rgba(76,175,125,0.25)", borderRadius: "12px", padding: "1rem" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#4caf7d", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
                    ✓ Best Answer
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.55, marginBottom: "8px" }}>
                    {best?.question}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: "6px", fontStyle: "italic", lineHeight: 1.5 }}>
                    {best?.user_ans?.slice(0, 120)}{(best?.user_ans?.length ?? 0) > 120 ? "..." : ""}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ height: "4px", flex: 1, background: "#2a2a2a", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "#4caf7d", width: `${((best?.rating ?? 0) / 5) * 100}%`, borderRadius: "2px" }} />
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#4caf7d", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {best?.rating ?? 0} / 5
                    </span>
                  </div>
                </div>

                <div style={{ background: "rgba(200,80,42,0.1)", border: "1px solid rgba(200,80,42,0.25)", borderRadius: "12px", padding: "1rem" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#f0a882", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
                    ↑ Needs Work
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.55, marginBottom: "8px" }}>
                    {worst?.question}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: "6px", fontStyle: "italic", lineHeight: 1.5 }}>
                    {worst?.user_ans
                      ? `${worst.user_ans.slice(0, 120)}${worst.user_ans.length > 120 ? "..." : ""}`
                      : "No answer recorded"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ height: "4px", flex: 1, background: "#2a2a2a", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "#c8502a", width: `${((worst?.rating ?? 0) / 5) * 100}%`, borderRadius: "2px" }} />
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#f0a882", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {worst?.rating ?? 0} / 5
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                {/* Score */}
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

                {/* Expected Answer — hidden when empty (questions are now plain strings) */}
                {feed.correct_ans && feed.correct_ans.trim().length > 0 ? (
                  <Card className="border-none space-y-3 p-4 bg-green-50 rounded-lg shadow-md">
                    <CardTitle className="flex items-center text-lg">
                      <CircleCheck className="mr-2 text-green-600" />
                      Expected Answer
                    </CardTitle>
                    <CardDescription className="font-medium text-gray-700">
                      {feed.correct_ans}
                    </CardDescription>
                  </Card>
                ) : (
                  <Card className="border-none space-y-3 p-4 bg-green-50 rounded-lg shadow-md">
                    <CardTitle className="flex items-center text-lg">
                      <CircleCheck className="mr-2 text-green-600" />
                      Expected Answer
                    </CardTitle>
                    <CardDescription className="font-medium text-gray-400 italic">
                      No model answer available for AI-generated questions.
                      Use the feedback below to understand what was missing.
                    </CardDescription>
                  </Card>
                )}

                {/* Your Answer */}
                <Card className="border-none space-y-3 p-4 bg-yellow-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <CircleCheck className="mr-2 text-yellow-600" />
                    Your Answer
                  </CardTitle>
                  <CardDescription className="font-medium text-gray-700">
                    {feed.user_ans || (
                      <span className="italic text-gray-400">No answer recorded.</span>
                    )}
                  </CardDescription>
                </Card>

                {/* Feedback */}
                <Card className="border-none space-y-3 p-4 bg-red-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <CircleCheck className="mr-2 text-red-600" />
                    Feedback
                  </CardTitle>
                  <CardDescription className="font-medium text-gray-700">
                    {feed.feedback || (
                      <span className="italic text-gray-400">No feedback available.</span>
                    )}
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