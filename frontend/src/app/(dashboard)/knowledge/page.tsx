"use client";

import { useState } from "react";
import { Network, Search, User, FileText, Cpu, Info } from "lucide-react";

export default function KnowledgeGraph() {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const graphNodes = [
    { id: "node-1", name: "Vivek Singh Bora", type: "Person", desc: "Software Architect. Leads database schema review and security migrations.", connections: ["node-3", "node-5", "node-7"] },
    { id: "node-2", name: "Alex Rivera", type: "Person", desc: "Frontend Engineer. Migrates routing components and integrates state stores.", connections: ["node-3", "node-6", "node-7"] },
    { id: "node-3", name: "Auth Migration", type: "Project", desc: "Core security overhaul, replacing token-based auth with managed Clerk/Auth.js.", connections: ["node-1", "node-2", "node-6"] },
    { id: "node-4", name: "RecruitEase Pro", type: "Project", desc: "Enterprise Applicant Tracking System integrations.", connections: ["node-1", "node-5"] },
    { id: "node-5", name: "PostgreSQL Database", type: "Technology", desc: "Primary relational storage running pgvector for memory storage.", connections: ["node-1", "node-4", "node-7"] },
    { id: "node-6", name: "Next.js 15", type: "Technology", desc: "Frontend app framework utilizing App Router and React 19.", connections: ["node-2", "node-3"] },
    { id: "node-7", name: "MM-104: Secure Tenancy", type: "Task", desc: "Implement organization separation foreign keys at the DB level.", connections: ["node-1", "node-5"] }
  ];

  const filteredNodes = graphNodes.filter((n) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = n.name.toLowerCase().includes(query) || n.type.toLowerCase().includes(query);
    const matchesFilter = filterType === "all" || n.type.toLowerCase() === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-8 max-w-7xl w-full mx-auto flex flex-col min-h-full text-[#0f172a]">
      <header className="w-full flex items-center justify-between border-b border-slate-200 pb-6 mb-8">
        <h1 className="text-lg font-bold font-outfit text-[#0f172a]">Organizational Knowledge Graph</h1>
        <span className="text-xs text-[#0f766e] font-bold flex items-center gap-1.5 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 shadow-sm">
          <Network className="w-4 h-4 text-[#0f766e]" /> Knowledge Graph
        </span>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow overflow-hidden">
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm">
            <h3 className="text-sm font-bold text-[#0f172a]">Graph Controls</h3>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-[#0f766e] text-slate-800 shadow-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {["all", "person", "project", "technology", "task"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`text-[10px] px-3 py-1.5 rounded-full border capitalize font-semibold transition-colors ${
                    filterType === type
                      ? "bg-[#0f766e] border-[#0f766e] text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-500 hover:text-[#0f172a] hover:border-slate-350"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {selectedNode ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#0f766e] tracking-wider">{selectedNode.type}</span>
                  <h4 className="text-base font-bold text-[#0f172a] mt-0.5">{selectedNode.name}</h4>
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-xs text-slate-400 hover:text-[#0f172a]">
                  Clear
                </button>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">{selectedNode.desc}</p>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Connected Entities</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.connections.map((connId: string) => {
                    const connNode = graphNodes.find((n) => n.id === connId);
                    return connNode ? (
                      <span
                        key={connId}
                        onClick={() => setSelectedNode(connNode)}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-[10px] text-slate-600 rounded-full hover:border-[#0f766e]/50 cursor-pointer transition-colors"
                      >
                        {connNode.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex items-center gap-3 text-slate-400 text-xs shadow-sm">
              <Info className="w-4 h-4 text-slate-400" />
              <span>Select any node on the canvas to inspect its relationships and context.</span>
            </div>
          )}
        </section>

        <section className="lg:col-span-8 p-6 rounded-2xl bg-white border border-slate-200 relative min-h-[450px] flex items-center justify-center overflow-hidden shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-45 pointer-events-none" />

          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: "450px" }}>
            <line x1="120" y1="120" x2="280" y2="220" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="420" y1="130" x2="280" y2="220" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="280" y1="220" x2="290" y2="350" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="120" y1="120" x2="130" y2="280" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="130" y1="280" x2="290" y2="350" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
          </svg>

          <div className="relative w-full h-full min-h-[400px]">
            <div
              onClick={() => setSelectedNode(graphNodes[0])}
              className="absolute left-[80px] top-[80px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#0f766e] cursor-pointer flex items-center gap-2 text-xs transition-all shadow-md hover:scale-105"
            >
              <User className="w-3.5 h-3.5 text-[#0f766e]" />
              <span className="font-semibold text-[#0f172a]">Vivek Singh Bora</span>
            </div>

            <div
              onClick={() => setSelectedNode(graphNodes[1])}
              className="absolute left-[380px] top-[90px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#0f766e] cursor-pointer flex items-center gap-2 text-xs transition-all shadow-md hover:scale-105"
            >
              <User className="w-3.5 h-3.5 text-[#0f766e]" />
              <span className="font-semibold text-[#0f172a]">Alex Rivera</span>
            </div>

            <div
              onClick={() => setSelectedNode(graphNodes[2])}
              className="absolute left-[220px] top-[180px] px-4 py-2.5 rounded-xl bg-white border border-teal-100 hover:border-[#0f766e] cursor-pointer flex items-center gap-2 text-xs transition-all shadow-md hover:scale-105"
            >
              <FileText className="w-3.5 h-3.5 text-[#0f766e]" />
              <span className="font-bold text-[#0f766e]">Auth Migration</span>
            </div>

            <div
              onClick={() => setSelectedNode(graphNodes[3])}
              className="absolute left-[20px] top-[240px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#0f766e] cursor-pointer flex items-center gap-2 text-xs transition-all shadow-md hover:scale-105"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-[#0f172a]">RecruitEase Pro</span>
            </div>

            <div
              onClick={() => setSelectedNode(graphNodes[4])}
              className="absolute left-[220px] top-[310px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#0f766e] cursor-pointer flex items-center gap-2 text-xs transition-all shadow-md hover:scale-105"
            >
              <Cpu className="w-3.5 h-3.5 text-teal-600" />
              <span className="font-semibold text-[#0f172a]">PostgreSQL Database</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
