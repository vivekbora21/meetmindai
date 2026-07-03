"use client";

import { useState } from "react";
import { Network, Search, User, FileText, Cpu, Info } from "lucide-react";

export default function KnowledgeGraph() {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const graphNodes = [
    { id: "node-1", name: "Vivek Sharma", type: "Person", desc: "Software Architect. Leads database schema review and security migrations.", connections: ["node-3", "node-5", "node-7"] },
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
    <div className="p-8 max-w-7xl w-full mx-auto flex flex-col min-h-full">
      <header className="w-full flex items-center justify-between border-b border-[#d8cfc2] pb-6 mb-8">
        <h1 className="text-lg font-bold font-outfit text-[#18161f]">Organizational Knowledge Graph</h1>
        <span className="text-xs text-[#6d6473] font-semibold flex items-center gap-1.5">
          <Network className="w-4 h-4 text-[#205866]" /> Knowledge Graph
        </span>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow overflow-hidden">
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="p-6 rounded-[24px] soft-card flex flex-col gap-4">
            <h3 className="text-sm font-bold text-[#18161f]">Graph Controls</h3>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8c8377]" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#d8cfc2] text-xs focus:outline-none focus:border-[#2f7c8f] text-[#18161f]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {["all", "person", "project", "technology", "task"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`text-[10px] px-3 py-1.5 rounded-full border capitalize font-semibold transition-colors ${
                    filterType === type
                      ? "bg-[#205866] border-[#205866] text-white"
                      : "bg-white border-[#d8cfc2] text-[#6d6473] hover:text-[#18161f] hover:border-[#bfae9d]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {selectedNode ? (
            <div className="p-6 rounded-[24px] soft-card flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#205866] tracking-wider">{selectedNode.type}</span>
                  <h4 className="text-base font-bold text-[#18161f] mt-0.5">{selectedNode.name}</h4>
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-xs text-[#6d6473] hover:text-[#18161f]">
                  Clear
                </button>
              </div>

              <p className="text-xs text-[#5f5767] leading-relaxed">{selectedNode.desc}</p>

              <div>
                <span className="text-[10px] font-bold text-[#6d6473] uppercase tracking-wider block mb-2">Connected Entities</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.connections.map((connId: string) => {
                    const connNode = graphNodes.find((n) => n.id === connId);
                    return connNode ? (
                      <span
                        key={connId}
                        onClick={() => setSelectedNode(connNode)}
                        className="px-2 py-1 bg-white border border-[#d8cfc2] text-[10px] text-[#18161f] rounded-full hover:border-[#2f7c8f]/50 cursor-pointer transition-colors"
                      >
                        {connNode.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-[24px] soft-card flex items-center gap-3 text-[#6d6473] text-xs">
              <Info className="w-4 h-4 text-[#8c8377]" />
              <span>Select any node on the canvas to inspect its relationships and context.</span>
            </div>
          )}
        </section>

        <section className="lg:col-span-8 p-6 rounded-[24px] soft-card relative min-h-[450px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#c8bdb0_1px,transparent_1px)] [background-size:16px_16px] opacity-35 pointer-events-none" />

          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: "450px" }}>
            <line x1="120" y1="120" x2="280" y2="220" stroke="#bfae9d" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="420" y1="130" x2="280" y2="220" stroke="#bfae9d" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="280" y1="220" x2="290" y2="350" stroke="#bfae9d" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="120" y1="120" x2="130" y2="280" stroke="#bfae9d" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="130" y1="280" x2="290" y2="350" stroke="#bfae9d" strokeWidth="1" strokeDasharray="3,3" />
          </svg>

          <div className="relative w-full h-full min-h-[400px]">
            <div
              onClick={() => setSelectedNode(graphNodes[0])}
              className="absolute left-[80px] top-[80px] px-3.5 py-2 rounded-xl bg-white border border-[#d8cfc2] hover:border-[#2f7c8f] cursor-pointer flex items-center gap-2 text-xs transition-all shadow-lg hover:scale-105"
            >
              <User className="w-3.5 h-3.5 text-[#205866]" />
              <span className="font-semibold text-[#18161f]">Vivek Sharma</span>
            </div>

            <div
              onClick={() => setSelectedNode(graphNodes[1])}
              className="absolute left-[380px] top-[90px] px-3.5 py-2 rounded-xl bg-white border border-[#d8cfc2] hover:border-[#2f7c8f] cursor-pointer flex items-center gap-2 text-xs transition-all shadow-lg hover:scale-105"
            >
              <User className="w-3.5 h-3.5 text-[#205866]" />
              <span className="font-semibold text-[#18161f]">Alex Rivera</span>
            </div>

            <div
              onClick={() => setSelectedNode(graphNodes[2])}
              className="absolute left-[220px] top-[180px] px-4 py-2.5 rounded-xl bg-white border border-[#2f7c8f]/30 hover:border-[#2f7c8f] cursor-pointer flex items-center gap-2 text-xs transition-all shadow-lg hover:scale-105"
            >
              <FileText className="w-3.5 h-3.5 text-[#205866]" />
              <span className="font-bold text-[#205866]">Auth Migration</span>
            </div>

            <div
              onClick={() => setSelectedNode(graphNodes[3])}
              className="absolute left-[20px] top-[240px] px-3.5 py-2 rounded-xl bg-white border border-[#d8cfc2] hover:border-[#2f7c8f] cursor-pointer flex items-center gap-2 text-xs transition-all shadow-lg hover:scale-105"
            >
              <FileText className="w-3.5 h-3.5 text-[#8c8377]" />
              <span className="font-semibold text-[#18161f]">RecruitEase Pro</span>
            </div>

            <div
              onClick={() => setSelectedNode(graphNodes[4])}
              className="absolute left-[220px] top-[310px] px-3.5 py-2 rounded-xl bg-white border border-[#d8cfc2] hover:border-[#2f7c8f] cursor-pointer flex items-center gap-2 text-xs transition-all shadow-lg hover:scale-105"
            >
              <Cpu className="w-3.5 h-3.5 text-[#c57b57]" />
              <span className="font-semibold text-[#18161f]">PostgreSQL Database</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
