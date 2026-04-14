import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils";
import { Eye, Newspaper, Sparkles, Trash2 } from "lucide-react";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { toast } from "sonner";
import type { Interview } from "@/types";


import {
  Card,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card"
import TooltipButton from "./tooltip-button";


interface InterviewPinProps {
  interview: Interview;
  onMockPage?: boolean;
  onDelete?: (id: string) => void;
}

const InterviewPin = ({
  interview,
  onMockPage = false,
  onDelete,
}: InterviewPinProps) => {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete the interview document
      await deleteDoc(doc(db, "interviews", interview.id));

      // Also delete all userAnswers linked to this interview
      const answersQuery = query(
        collection(db, "userAnswers"),
        where("mockIdRef", "==", interview.id)
      );
      const answersSnap = await getDocs(answersQuery);
      const deletePromises = answersSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      toast.success("Deleted", {
        description: "Interview and all saved answers have been deleted.",
      });
      onDelete?.(interview.id);
    } catch (error) {
      console.log(error);
      toast.error("Error", {
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Card className="p-4 rounded-md shadow-none hover:shadow-md shadow-gray-100 cursor-pointer transition-all space-y-4">
        <CardTitle className="text-lg">{interview?.position}</CardTitle>
        <CardDescription>{interview?.description}</CardDescription>
        <div className="w-full flex items-center gap-2 flex-wrap">
          {interview?.techStack.split(",").map((word, index) => (
            <Badge
              key={index}
              variant={"outline"}
              className="text-xs text-muted-foreground hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-900"
            >
              {word}
            </Badge>
          ))}
        </div>

        <CardFooter
          className={cn(
            "w-full flex items-center p-0",
            onMockPage ? "justify-end" : "justify-between"
          )}
        >
          <p className="text-[12px] text-muted-foreground truncate whitespace-nowrap">
            {`${new Date(interview?.createdAt.toDate()).toLocaleDateString(
              "en-US",
              { dateStyle: "long" }
            )} - ${new Date(interview?.createdAt.toDate()).toLocaleTimeString(
              "en-US",
              { timeStyle: "short" }
            )}`}
          </p>

          {!onMockPage && (
            <div className="flex items-center justify-center">
              <TooltipButton
                content="View"
                buttonVariant={"ghost"}
                onClick={() => {
                  navigate(`/generate/${interview?.id}`, { replace: true });
                }}
                disbaled={false}
                buttonClassName="hover:text-sky-500"
                icon={<Eye />}
                loading={false}
              />

              <TooltipButton
                content="Feedback"
                buttonVariant={"ghost"}
                onClick={() => {
                  navigate(`/generate/feedback/${interview?.id}`, {
                    replace: true,
                  });
                }}
                disbaled={false}
                buttonClassName="hover:text-yellow-500"
                icon={<Newspaper />}
                loading={false}
              />

              <TooltipButton
                content="Start"
                buttonVariant={"ghost"}
                onClick={() => {
                  navigate(`/generate/interview/${interview?.id}`, {
                    replace: true,
                  });
                }}
                disbaled={false}
                buttonClassName="hover:text-sky-500"
                icon={<Sparkles />}
                loading={false}
              />

              <TooltipButton
                content="Delete"
                buttonVariant={"ghost"}
                onClick={() => setShowConfirm(true)}
                disbaled={false}
                buttonClassName="hover:text-red-500"
                icon={<Trash2 />}
                loading={false}
              />
            </div>
          )}
        </CardFooter>
      </Card>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Delete Interview?</h2>
            <p className="text-sm text-gray-500">
              This will permanently delete the interview and all saved answers. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InterviewPin;