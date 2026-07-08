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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginTop: "12px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          paddingLeft: "4px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Suggested Questions
      </span>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        {questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onQuestionClick(q)}
            style={{
              textAlign: "left",
              fontSize: "11px",
              padding: "8px 14px",
              borderRadius: "99px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#0f766e",
              fontWeight: 550,
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f0fdfa";
              e.currentTarget.style.borderColor = "#99f6e4";
              e.currentTarget.style.color = "#0d9488";
              e.currentTarget.style.transform = "translateY(-0.5px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.color = "#0f766e";
              e.currentTarget.style.transform = "none";
            }}
          >
            <Sparkles size={11} style={{ opacity: 0.8 }} />
            <span>{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
