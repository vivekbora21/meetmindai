"use client";

import { useState } from "react";
import { Network, Search, FileText, Cpu, Info, Share2 } from "lucide-react";

interface GraphNode {
  id: string;
  name: string;
  type: string;
  desc: string;
  connections: string[];
}

export default function KnowledgeGraph() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const graphNodes: GraphNode[] = [
    { id: "node-1", name: "Vivek Singh Bora", type: "Person", desc: "Software Architect. Leads database schema review and security migrations.", connections: ["node-3", "node-5", "node-7"] },
    { id: "node-2", name: "Alex Rivera", type: "Person", desc: "Alex Rivera is a Frontend Engineer. Migrates routing components and integrates state stores.", connections: ["node-3", "node-6", "node-7"] },
    { id: "node-3", name: "Auth Migration", type: "Project", desc: "Core security overhaul, replacing token-based auth with managed Clerk/Auth.js.", connections: ["node-1", "node-2", "node-6"] },
    { id: "node-4", name: "RecruitEase Pro", type: "Project", desc: "Enterprise Applicant Tracking System integrations.", connections: ["node-1", "node-5"] },
    { id: "node-5", name: "PostgreSQL Database", type: "Technology", desc: "Primary relational storage running pgvector for memory storage.", connections: ["node-1", "node-4", "node-7"] },
    { id: "node-6", name: "Next.js 15", type: "Technology", desc: "Frontend app framework utilizing App Router and React 19.", connections: ["node-2", "node-3"] },
    { id: "node-7", name: "MM-104: Secure Tenancy", type: "Task", desc: "Implement organization separation foreign keys at the DB level.", connections: ["node-1", "node-5"] }
  ];

  return (
    <div className="p-8 max-w-9xl w-full mx-auto flex flex-col min-h-full text-[#102C23] animate-fade-in-up">
      {/* Top Banner / Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#113229] to-[#0D241E] p-8 text-white shadow-xl shadow-[#113229]/10 mb-8">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#D98A44]/10 blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-[#113229]/40 blur-3xl"></div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit tracking-tight">Organizational Knowledge Graph</h1>
            <p className="text-slate-350 text-xs sm:text-sm max-w-xl font-medium">
              Explore interconnected entities, dependencies, project mappings, and technical expertise extracted from your operations.
            </p>
          </div>
          <span className="text-xs text-[#e9a15f] bg-[#D98A44]/15 border border-[#D98A44]/35 px-4 py-2 rounded-2xl font-bold flex items-center gap-1.5">
            <Network className="w-4 h-4" /> Relational Graph View
          </span>
        </div>
      </section>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow overflow-hidden items-start">
        {/* Sidebar Controls & Inspector */}
        <section className="lg:col-span-4 flex flex-col gap-6 w-full">
          {/* Controls Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex flex-col gap-5 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search & Filter</span>
              <h3 className="text-sm font-bold text-[#102C23] mt-0.5">Graph Controls</h3>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F9F8F6] border border-slate-205 focus:bg-white text-xs focus:outline-none focus:border-[#113229] text-slate-800 shadow-inner font-medium"
              />
            </div>
            
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["all", "person", "project", "technology", "task"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`text-[10px] px-3.5 py-1.5 rounded-full border capitalize font-bold transition-all ${
                    filterType === type
                      ? "bg-[#113229] border-[#113229] text-white shadow-sm"
                      : "bg-[#F9F8F6] border-slate-200 text-slate-500 hover:text-[#102C23] hover:border-slate-300"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Node Inspector Card */}
          {selectedNode ? (
            <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex flex-col gap-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-[#D98A44] bg-[#D98A44]/10 border border-[#D98A44]/20 px-2 py-0.5 rounded-md self-start tracking-wider">
                    {selectedNode.type}
                  </span>
                  <h4 className="text-base font-extrabold text-[#102C23] mt-1.5 font-outfit">{selectedNode.name}</h4>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)} 
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                >
                  Clear Selection
                </button>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-medium">{selectedNode.desc}</p>

              <div className="border-t border-slate-50 pt-4">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2.5">Connected Entities</span>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.connections.map((connId: string) => {
                    const connNode = graphNodes.find((n) => n.id === connId);
                    return connNode ? (
                      <span
                        key={connId}
                        onClick={() => setSelectedNode(connNode)}
                        className="px-3 py-1.5 bg-[#F9F8F6] border border-slate-200 text-[10px] text-slate-600 font-bold rounded-full hover:border-[#113229] hover:bg-[#113229]/5 cursor-pointer transition-all"
                      >
                        {connNode.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 flex items-center gap-3 text-slate-400 text-xs shadow-sm">
              <Info className="w-4.5 h-4.5 text-[#D98A44] flex-shrink-0" />
              <span className="font-semibold text-slate-450 leading-normal">
                Click any node on the graph canvas to inspect its relationships and contextual data.
              </span>
            </div>
          )}
        </section>

        {/* Graph Canvas */}
        <section className="lg:col-span-8 p-6 rounded-2xl bg-white border border-[#DEDDDA]/60 relative min-h-[480px] flex items-center justify-center overflow-hidden shadow-sm">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

          {/* SVG Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: "480px" }}>
            <line x1="150" y1="120" x2="310" y2="220" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="450" y1="130" x2="310" y2="220" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="310" y1="220" x2="320" y2="350" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="150" y1="120" x2="160" y2="280" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="160" y1="280" x2="320" y2="350" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />
          </svg>

          <div className="relative w-full h-full min-h-[420px]">
            {/* Person: Vivek Singh Bora */}
            <div
              onClick={() => setSelectedNode(graphNodes[0])}
              className={`absolute left-[70px] top-[80px] px-4 py-2.5 rounded-xl bg-white border cursor-pointer flex items-center gap-2 text-xs transition-all shadow-md hover:shadow-lg hover:scale-105 ${
                selectedNode?.id === "node-1" ? "border-[#113229] ring-2 ring-[#113229]/15" : "border-slate-200"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                V
              </div>
              <span className="font-bold text-[#102C23]">Vivek Singh Bora</span>
            </div>

            {/* Person: Alex Rivera */}
            <div
              onClick={() => setSelectedNode(graphNodes[1])}
              className={`absolute left-[390px] top-[90px] px-4 py-2.5 rounded-xl bg-white border cursor-pointer flex items-center gap-2 text-xs transition-all shadow-md hover:shadow-lg hover:scale-105 ${
                selectedNode?.id === "node-2" ? "border-[#113229] ring-2 ring-[#113229]/15" : "border-slate-200"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                A
              </div>
              <span className="font-bold text-[#102C23]">Alex Rivera</span>
            </div>

            {/* Project: Auth Migration */}
            <div
              onClick={() => setSelectedNode(graphNodes[2])}
              className={`absolute left-[240px] top-[180px] px-4.5 py-3 rounded-xl bg-[#113229] border text-white cursor-pointer flex items-center gap-2.5 text-xs transition-all shadow-lg hover:scale-105 ${
                selectedNode?.id === "node-3" ? "border-[#D98A44] ring-2 ring-[#D98A44]/30" : "border-[#113229]"
              }`}
            >
              <FileText className="w-4 h-4 text-[#e9a15f]" />
              <span className="font-bold font-outfit">Auth Migration</span>
            </div>

            {/* Project: RecruitEase Pro */}
            <div
              onClick={() => setSelectedNode(graphNodes[3])}
              className={`absolute left-[20px] top-[240px] px-4 py-2.5 rounded-xl bg-white border cursor-pointer flex items-center gap-2 text-xs transition-all shadow-md hover:shadow-lg hover:scale-105 ${
                selectedNode?.id === "node-4" ? "border-[#113229] ring-2 ring-[#113229]/15" : "border-slate-200"
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-slate-450" />
              <span className="font-bold text-[#102C23]">RecruitEase Pro</span>
            </div>

            {/* Technology: PostgreSQL Database */}
            <div
              onClick={() => setSelectedNode(graphNodes[4])}
              className={`absolute left-[230px] top-[320px] px-4 py-2.5 rounded-xl bg-white border cursor-pointer flex items-center gap-2 text-xs transition-all shadow-md hover:shadow-lg hover:scale-105 ${
                selectedNode?.id === "node-5" ? "border-[#113229] ring-2 ring-[#113229]/15" : "border-slate-200"
              }`}
            >
              <Cpu className="w-4 h-4 text-teal-600" />
              <span className="font-bold text-[#102C23]">PostgreSQL Database</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
