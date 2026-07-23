import React from "react";
import { Sparkles } from "lucide-react";

interface SuggestedQuestionsProps {
  onQuestionClick: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onQuestionClick }) => {
  const questions = [
    "What is this meeting about?",
    "Summarize this meeting",
    "What action items were assigned?",
    "What decisions were made?",
    "What risks were discussed?",
  ];

  return (
    <div className="flex flex-col gap-2.5 mt-3 w-full box-border font-outfit">
      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1 font-sans">
        Suggested Questions
      </span>
      <ul className="flex flex-wrap gap-2 m-0 p-0 list-none">
        {questions.map((q, idx) => (
          <li key={idx}>
            <button
              onClick={() => onQuestionClick(q)}
              aria-label={`Ask: ${q}`}
              className="text-left text-[11px] px-3.5 py-2 rounded-full border border-slate-200 bg-white text-[#113229] font-bold cursor-pointer transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:bg-[#e6f4f1]/60 hover:border-[#113229]/30 hover:text-[#0D241E] hover:-translate-y-0.5"
            >
              <Sparkles size={11} className="opacity-80" aria-hidden="true" />
              <span>{q}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
