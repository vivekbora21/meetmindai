import React, { useRef, useEffect } from "react";
import { MessageSquare, Loader2, Bot } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { ChatHeader } from "./ChatHeader";
import { ChatHistory } from "./ChatHistory";
import { ChatBubble } from "./ChatBubble";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { MessageInput } from "./MessageInput";

interface ChatWindowProps {
  meetingId: string | null;
  status?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ meetingId, status = "" }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    chatInput,
    setChatInput,
    chatMessages,
    chatLoading,
    chatStatus,
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    isEditingTitle,
    setIsEditingTitle,
    newTitleVal,
    setNewTitleVal,
    showExportMenu,
    setShowExportMenu,
    handleNewChat,
    handleClearChat,
    handleToggleArchive,
    handleRenameTitle,
    submitChatQuestion,
    handleSuggestedQuestionClick,
    copyToClipboard,
    exportMarkdown,
    exportPDF,
    fetchChatSession
  } = useChat(meetingId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const statusNorm = (status || "").toUpperCase();
  const isReadyForChat = !meetingId || statusNorm === "COMPLETED" || statusNorm === "TRANSCRIBED" || statusNorm === "ANALYZING";
  const isFailed = !!meetingId && (statusNorm === "FAILED" || statusNorm === "ERROR");

  if (isFailed) {
    return (
      <section 
        aria-label="Meeting Chat Assistant Unavailable"
        className="lg:col-span-5 p-6 rounded-2xl flex flex-col justify-center h-[700px] bg-white border border-[#e2e8f0] shadow-sm overflow-hidden font-outfit"
      >
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
          <div className="w-13 h-13 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <MessageSquare size={22} className="text-rose-600" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-outfit font-extrabold text-sm text-[#102C23] m-0">Chat Unavailable</h3>
            <p className="font-sans text-xs text-slate-500 max-w-[220px] leading-relaxed m-0 font-medium">
              Meeting processing failed. No transcript or insights are available.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
            <span className="font-sans text-[10px] font-extrabold text-rose-600">Processing failed</span>
          </div>
        </div>
      </section>
    );
  }

  if (!isReadyForChat) {
    return (
      <section 
        aria-label="Meeting Chat Assistant Loading"
        className="lg:col-span-5 p-6 rounded-2xl flex flex-col justify-center h-[700px] bg-white border border-[#e2e8f0] shadow-sm overflow-hidden font-outfit"
      >
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
          <div className="w-13 h-13 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center">
            <Bot size={22} className="text-[#113229]" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-outfit font-extrabold text-sm text-[#102C23] m-0">Meeting Chat</h3>
            <p className="font-sans text-xs text-slate-500 max-w-[200px] leading-relaxed m-0 font-medium">
              Available once AI finishes processing the transcript.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-250 px-3 py-1.5 rounded-full animate-pulse">
            <Loader2 size={12} className="text-[#113229] animate-spin" aria-hidden="true" />
            <span className="font-sans text-[10px] font-extrabold text-[#113229]">AI Pipeline running...</span>
          </div>
        </div>
      </section>
    );
  }

  const hasMessages = chatMessages.length > 0;

  return (
    <section 
      aria-label="Meeting Chat Assistant"
      className="lg:col-span-5 rounded-2xl flex flex-col h-[700px] bg-white border border-[#e2e8f0] shadow-sm overflow-hidden relative font-outfit"
    >
      {/* Top teal accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#113229] via-[#D98A44] to-[#0D241E] z-10" />

      <div className="flex flex-col h-full pt-[3px] overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-4 flex-shrink-0">
          <ChatHeader
            title={activeSession?.title || "New Chat"}
            isArchived={!!activeSession?.is_archived}
            isEditingTitle={isEditingTitle}
            newTitleVal={newTitleVal}
            showExportMenu={showExportMenu}
            setNewTitleVal={setNewTitleVal}
            setIsEditingTitle={setIsEditingTitle}
            setShowExportMenu={setShowExportMenu}
            handleRenameTitle={handleRenameTitle}
            handleToggleArchive={handleToggleArchive}
            handleClearChat={handleClearChat}
            copyToClipboard={copyToClipboard}
            exportMarkdown={exportMarkdown}
            exportPDF={exportPDF}
          />
        </div>

        {/* Body: sidebar + messages */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Sidebar */}
          <div className="w-[244px] min-w-[244px] pl-4 pr-3 py-4 flex-shrink-0 border-r border-[#e2e8f0] box-border flex flex-col h-full bg-white z-10">
            <ChatHistory
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={(id) => {
                setActiveSessionId(id);
                fetchChatSession(id);
              }}
              onNewChat={handleNewChat}
            />
          </div>

          {/* Messages area */}
          <div className="flex flex-col flex-1 overflow-hidden bg-[#F9F8F6]/20">
            {/* Scrollable messages */}
            <div className="scrollbar flex-1 overflow-y-auto px-5 pt-5 pb-2 flex flex-col gap-4">
              {/* Empty state */}
              {!hasMessages && (
                <div className="flex flex-col gap-3 flex-1 justify-center max-w-md mx-auto w-full">
                  {/* Greeting bubble */}
                  <div className="flex gap-2.5 items-end">
                    <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-700">
                      <Bot size={14} className="text-white" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 max-w-[85%]">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">MeetMind AI</span>
                      <div className="relative bg-white border border-[#e2e8f0] p-4.5 rounded-2xl rounded-bl-sm text-xs text-slate-650 leading-relaxed font-sans shadow-sm overflow-hidden animate-fade-in-up">
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#113229] via-[#D98A44] to-[#0D241E]" />
                        <p className="m-0 font-medium">👋 Hi! I&apos;ve read through the meeting. Ask me anything or pick a suggested question below.</p>
                      </div>
                    </div>
                  </div>
                  <SuggestedQuestions onQuestionClick={handleSuggestedQuestionClick} />
                </div>
              )}

              {/* Chat messages */}
              {chatMessages.map((msg, idx) => (
                <ChatBubble key={idx} message={msg} />
              ))}

              {/* Typing indicator */}
              {chatLoading && (
                <div className="flex items-end gap-2.5" role="status" aria-live="polite">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-700">
                    <Bot size={13} className="text-white" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">MeetMind AI</span>
                    <div className="bg-white border border-[#e2e8f0] p-4.5 rounded-2xl rounded-bl-sm flex items-center gap-2.5 shadow-sm">
                      <div className="flex gap-1 items-center">
                        {[0, 150, 300].map((delay, i) => (
                          <span
                            key={i}
                            style={{ animationDelay: `${delay}ms` }}
                            className="w-1.5 h-1.5 rounded-full bg-[#113229] inline-block animate-bounce"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold font-sans">
                        {chatStatus === "searching" ? "Searching transcript..." : chatStatus === "generating" ? "Generating answer..." : "Thinking..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 flex-shrink-0 bg-white border-t border-[#e2e8f0]/65">
              <MessageInput
                chatInput={chatInput}
                setChatInput={setChatInput}
                chatLoading={chatLoading}
                isArchived={!!activeSession?.is_archived}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInput.trim()) return;
                  submitChatQuestion(chatInput);
                }}
                onReopen={() => handleToggleArchive(false)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
