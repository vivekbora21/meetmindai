import React from "react";
import { FileAudio, Code2 } from "lucide-react";
import { MeetingDetail } from "../types/meeting";
import { InsightSkeleton } from "./InsightSkeleton";

interface MeetingTechnicalProps {
  detail: MeetingDetail;
  audioSrc: string;
}

export const MeetingTechnical: React.FC<MeetingTechnicalProps> = ({ detail, audioSrc }) => {
  const status = (detail.technical_status || detail.embedding_status || detail.kg_status || detail.ai_status || "").toUpperCase();
  const isLoading =
    !detail.technical_context &&
    !["COMPLETED", "SUCCESS", "FAILED", "ERROR", "SKIPPED"].includes(status);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightSkeleton title="Technical Analysis" hint="Mapping repositories, files, APIs, and storage references." accentClassName="bg-indigo-200" />
        <InsightSkeleton title="Knowledge Graph" hint="Building the relationship graph from the transcript and entities." accentClassName="bg-violet-200" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {detail.recording_url && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col gap-2 shadow-sm md:col-span-2">
          <h4 className="text-xs font-bold text-[#102C23] flex items-center gap-1.5 font-outfit">
            <FileAudio className="w-3.5 h-3.5 text-[#113229]" /> Uploaded File Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500 font-medium">
            <div>
              <span className="font-semibold text-slate-400">Original Name:</span> {detail.original_filename || "N/A"}
            </div>
            <div>
              <span className="font-semibold text-slate-400">Content Type:</span> {detail.content_type || "N/A"}
            </div>
            <div>
              <span className="font-semibold text-slate-400">File Size:</span> {detail.file_size ? `${(detail.file_size / (1024 * 1024)).toFixed(2)} MB` : "N/A"}
            </div>
            <div>
              <span className="font-semibold text-slate-400">File URL:</span>{" "}
              <a href={audioSrc} target="_blank" rel="noreferrer" className="text-[#113229] hover:underline break-all">
                {detail.recording_url}
              </a>
            </div>
          </div>
        </div>
      )}
      
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col gap-2 shadow-sm">
        <h4 className="text-xs font-bold text-[#102C23] flex items-center gap-1.5 font-outfit">
          <Code2 className="w-3.5 h-3.5 text-[#113229]" /> Repositories & Files
        </h4>
        <ul className="text-xs text-slate-500 flex flex-col gap-1">
          {detail.technical_context?.repositories?.map((repo: string, idx: number) => (
            <li key={idx} className="text-[#113229] font-medium">{repo}</li>
          )) || <li className="text-slate-400">None</li>}
          {detail.technical_context?.files?.map((file: string, idx: number) => (
            <li key={idx} className="font-mono text-[11px] text-slate-500">{file}</li>
          )) || <li className="text-slate-400">None</li>}
        </ul>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col gap-2 shadow-sm">
        <h4 className="text-xs font-bold text-[#102C23] flex items-center gap-1.5 font-outfit">APIs & Tables</h4>
        <ul className="text-xs text-slate-500 flex flex-col gap-1">
          {detail.technical_context?.apis?.map((api: string, idx: number) => (
            <li key={idx} className="font-mono text-[10px] bg-[#F9F8F6] border border-slate-200 px-1 py-0.5 rounded w-fit text-slate-600">
              {api}
            </li>
          )) || <li className="text-slate-400">None</li>}
          {detail.technical_context?.database_tables?.map((table: string, idx: number) => (
            <li key={idx} className="text-[#102C23] font-medium">{table}</li>
          )) || <li className="text-slate-400">None</li>}
        </ul>
      </div>
    </div>
  );
};
