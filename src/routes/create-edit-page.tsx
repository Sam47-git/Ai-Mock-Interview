import FormMockInterview from "@/components/form-mock-interviews";
import { useParams } from "react-router-dom";
import { useInterview } from "@/hooks/use-interview";

const CreateEditPage = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { interview } = useInterview(interviewId);

  return (
    <div className="my-4 flex-col w-full" style={{ background: "#f5f2ee" }}>
      <FormMockInterview initialData={interview} />
    </div>
  );
};

export default CreateEditPage;