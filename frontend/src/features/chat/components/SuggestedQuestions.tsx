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
    "What deadlines exist?"
  ];

  return (
    <div className="flex flex-col gap-2 my-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 pl-1">Suggested Questions</span>
      <div className="flex flex-col gap-1.5">
        {questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onQuestionClick(q)}
            className="text-left text-[11px] p-2.5 rounded-xl border border-slate-200 bg-white/60 hover:bg-slate-50 text-[#0f766e] hover:text-[#0f172a] font-semibold transition-all shadow-sm flex items-center justify-between group hover:border-[#0f766e]/50"
          >
            <span>{q}</span>
            <Sparkles className="w-3.5 h-3.5 text-[#0f766e] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
};
