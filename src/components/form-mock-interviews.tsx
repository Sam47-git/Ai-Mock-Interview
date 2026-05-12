import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";

import type { Interview } from "@/types";
import CustomBreadCrumb from "./custom-bread-crumb";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { toast } from "sonner";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { Button } from "./ui/button";
import { Loader, Trash2 } from "lucide-react";
import Headings from "./headings";
import { Separator } from "./ui/separator";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { createChatSession } from "@/scripts";
import { parseAiJson } from "@/lib/ai-utils";
import Modal from "./modal";

interface FormMockInterviewProps {
  initialData: Interview | null;
}

const formSchema = z.object({
  position: z
    .string()
    .min(1, "Position is required")
    .max(100, "Position must be 100 characters or less"),
  description: z.string().min(10, "Description is required"),
  experience: z.coerce
    .number()
    .min(0, "Experience cannot be empty or negative"),
  techStack: z.string().min(1, "Tech stack must be at least a character"),
});

type FormData = z.infer<typeof formSchema>;

const FormMockInterview = ({ initialData }: FormMockInterviewProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      position: initialData?.position || "",
      description: initialData?.description || "",
      experience: initialData?.experience || 0,
      techStack: initialData?.techStack || "",
    },
  });

  // FIX: only use `loading` to control disabled/spinner state.
  // Never read isValid or isSubmitted inside onSubmit — they are stale there.
  // react-hook-form only calls onSubmit when validation passes, so no guard needed.
  const [loading, setLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const navigate = useNavigate();
  const { userId } = useAuth();

  const title = initialData ? initialData.position : "Create a new mock interview";
  const breadCrumbPage = initialData ? initialData.position : "Create";
  const actions = initialData ? "Save Changes" : "Create";
  const toastMessage = initialData
    ? { title: "Updated!", description: "Changes saved successfully." }
    : { title: "Created!", description: "New mock interview created." };

  const generateAiResponse = async (data: FormData) => {
    const prompt = `
      As an experienced prompt engineer, generate a JSON array containing
      5 technical interview questions along with detailed answers based on
      the following job information. Each object in the array should have
      the fields "question" and "answer", formatted as follows:

      [
        { "question": "<Question text>", "answer": "<Answer text>" },
        ...
      ]

      Job Information:
      - Job Position: ${data.position}
      - Job Description: ${data.description}
      - Years of Experience Required: ${data.experience}
      - Tech Stacks: ${data.techStack}

      The questions should assess skills in ${data.techStack} development
      and best practices, problem-solving, and experience handling complex
      requirements. Please format the output strictly as an array of JSON
      objects without any additional labels, code blocks, or explanations.
      Return only the JSON array with questions and answers.
    `;

    const session = createChatSession();
    const aiResult = await session.sendMessage(prompt);
    return parseAiJson<{ question: string; answer: string }[]>(
      aiResult.response.text()
    );
  };

  // onSubmit is only called by react-hook-form when validation passes.
  // No need to re-check isValid inside here — that's what caused the bug.
  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      setLoading(true);

      const aiResult = await generateAiResponse(data);

      if (initialData) {
        // Update existing interview
        await updateDoc(doc(db, "interviews", initialData.id), {
          questions: aiResult,
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new interview
        await addDoc(collection(db, "interviews"), {
          ...data,
          userId,
          questions: aiResult,
          createdAt: serverTimestamp(),
        });
      }

      toast(toastMessage.title, { description: toastMessage.description });
      navigate("/generate", { replace: true });
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message?.includes("503")) {
        toast.error("API Service Overloaded", {
          description:
            "The AI service is experiencing high demand. Please try again in a few moments.",
        });
      } else if (
        error instanceof Error &&
        error.message?.includes("fetch")
      ) {
        toast.error("Network Error", {
          description:
            "Failed to connect to the AI service. Check your internet connection.",
        });
      } else {
        toast.error("Error", {
          description: "Something went wrong. Please try again later.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfirm = () => {
    form.reset({
      position: "",
      description: "",
      experience: 0,
      techStack: "",
    });
    setShowResetConfirm(false);
  };

  const handleDeleteInterview = async () => {
    if (!initialData?.id) return;
    try {
      setLoading(true);
      const userAnswersSnap = await getDocs(
        query(
          collection(db, "userAnswers"),
          where("mockIdRef", "==", initialData.id)
        )
      );
      for (const answerDoc of userAnswersSnap.docs) {
        await deleteDoc(doc(db, "userAnswers", answerDoc.id));
      }
      await deleteDoc(doc(db, "interviews", initialData.id));
      toast("Deleted", {
        description: "Interview has been deleted successfully.",
      });
      navigate("/generate", { replace: true });
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Failed to delete interview. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      form.reset({
        position: initialData.position,
        description: initialData.description,
        experience: initialData.experience,
        techStack: initialData.techStack,
      });
    }
  }, [initialData, form]);

  return (
    <div className="w-full flex-col space-y-4">
      <CustomBreadCrumb
        breadCrumbPage={breadCrumbPage}
        breadCrumbItems={[{ label: "Mock Interviews", link: "/generate" }]}
      />

      <div className="mt-4 flex items-center justify-between w-full">
        <Headings title={title} isSubHeading />
        {initialData && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDeleteInterview}
            disabled={loading}
          >
            <Trash2 className="min-w-4 min-h-4 text-red-500" />
          </Button>
        )}
      </div>

      <Separator className="my-4" />

      <div className="my-6" />

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full p-8 rounded-lg flex-col flex items-start justify-start gap-6 shadow-md"
        >
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Job Role / Job Position</FormLabel>
                  <FormMessage className="text-sm" />
                </div>
                <FormControl>
                  <Input
                    className="h-12"
                    disabled={loading}
                    placeholder="eg:- Full Stack Developer"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Job Description</FormLabel>
                  <FormMessage className="text-sm" />
                </div>
                <FormControl>
                  <Textarea
                    className="h-12"
                    disabled={loading}
                    placeholder="eg:- describe your job role"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="experience"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Years of Experience</FormLabel>
                  <FormMessage className="text-sm" />
                </div>
                <FormControl>
                  <Input
                    type="number"
                    className="h-12"
                    disabled={loading}
                    placeholder="eg:- 5 Years"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="techStack"
            render={({ field }) => (
              <FormItem className="w-full space-y-4">
                <div className="w-full flex items-center justify-between">
                  <FormLabel>Tech Stacks</FormLabel>
                  <FormMessage className="text-sm" />
                </div>
                <FormControl>
                  <Textarea
                    className="h-12"
                    disabled={loading}
                    placeholder="eg:- React, Typescript..."
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="w-full flex items-center justify-end gap-6">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => setShowResetConfirm(true)}
            >
              Reset
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
            >
              {loading ? (
                <Loader className="text-gray-50 animate-spin" />
              ) : (
                actions
              )}
            </Button>
          </div>
        </form>
      </FormProvider>

      <Modal
        title="Reset Form?"
        description="This will clear all entered fields. Are you sure you want to proceed?"
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
      >
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            onClick={() => setShowResetConfirm(false)}
            size="sm"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleResetConfirm}
            size="sm"
            variant="outline"
            className="bg-orange-600 text-white hover:bg-orange-700 border-orange-600"
          >
            Yes, Reset
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default FormMockInterview;