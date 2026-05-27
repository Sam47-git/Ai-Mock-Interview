import type { FieldValue, Timestamp } from "firebase/firestore/lite";

export interface User {
    id: string;
    name: string;
    email: string;
    imageUrl: string;
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
}

export interface Interview {
  id: string;
  position: string;
  description: string;
  experience: number;
  userId: string;
  techStack: string;
  questions: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserAnswer {
  id: string;
  mockIdRef: string;
  question: string;
  correct_ans: string;
  user_ans: string;
  feedback: string;
  rating: number;
  accuracy: number;
  completeness: number;
  clarity: number;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}