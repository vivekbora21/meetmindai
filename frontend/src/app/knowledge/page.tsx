"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Network, Search, User, FileText, Cpu, CheckSquare, Plus, Info } from "lucide-react";

export default function KnowledgeGraph() {
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Mock Graph nodes representing connections
  const graphNodes = [
    { id: "node-1", name: "Vivek Sharma", type: "Person", desc: "Software Architect. Leads database schema review and security migrations.", connections: ["node-3", "node-5", "node-7"] },
    { id: "node-2", name: "Alex Rivera", type: "Person", desc: "Frontend Engineer. Migrates routing components and integrates state stores.", connections: ["node-3", "node-6", "node-7"] },
    { id: "node-3", name: "Auth Migration", type: "Project", desc: "Core security overhaul, replacing token-based auth with managed Clerk/Auth.js.", connections: ["node-1", "node-2", "node-6"] },
    { id: "node-4", name: "RecruitEase Pro", type: "Project", desc: "Enterprise Applicant Tracking System integrations.", connections: ["node-1", "node-5"] },
    { id: "node-5", name: "PostgreSQL Database", type: "Technology", desc: "Primary relational storage running pgvector for memory storage.", connections: ["node-1", "node-4", "node-7"] },
    { id: "node-6", name: "Next.js 15", type: "Technology", desc: "Frontend app framework utilizing App Router and React 19.", connections: ["node-2", "node-3"] },
    { id: "node-7", name: "MM-104: Secure Tenancy", type: "Task", desc: "Implement organization separation foreign keys at the DB level.", connections: ["node-1", "node-5"] }
  ];

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
  };

  const filteredNodes = graphNodes.filter(n => {
    const matchesSearch = n.name.toLowerCase().includes(searchQuery.toLowerCase()) || n.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || n.type.toLowerCase() === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="bg-[#09090b] text-[#fafafa] min-h-screen flex flex-col p-8 selection:bg-violet-500 selection:text-white">
      {/* Header bar */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between border-b border-zinc-800 pb-6 mb-8">
        <button 
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <span className="text-xs text-zinc-500 font-semibold flex items-center gap-1.5"><Network className="w-4 h-4 text-violet-400" /> Organizational Knowledge Graph</span>
      </header>

      {/* Main Graph Layout */}
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow overflow-hidden">
        {/* Left Control / Search Panel */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white">Graph Controls</h3>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-violet-500 text-zinc-200"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2">
              {["all", "person", "project", "technology", "task"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`text-[10px] px-3 py-1.5 rounded-md border capitalize font-semibold transition-colors ${
                    filterType === type 
                      ? "bg-violet-600 border-violet-500 text-white" 
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Node detail card */}
          {selectedNode ? (
            <div className="p-6 rounded-xl bg-zinc-900/60 border border-violet-500/30 flex flex-col gap-4 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">{selectedNode.type}</span>
                  <h4 className="text-base font-bold text-white mt-0.5">{selectedNode.name}</h4>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)} 
                  className="text-xs text-zinc-500 hover:text-white"
                >
                  Clear
                </button>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                {selectedNode.desc}
              </p>

              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Connected Entities</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.connections.map((connId: string) => {
                    const connNode = graphNodes.find(n => n.id === connId);
                    return connNode ? (
                      <span 
                        key={connId} 
                        onClick={() => setSelectedNode(connNode)}
                        className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded hover:border-violet-500/50 cursor-pointer transition-colors"
                      >
                        {connNode.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center gap-3 text-zinc-500 text-xs">
              <Info className="w-4 h-4 text-zinc-400" />
              <span>Select any node on the canvas to inspect its relationships and context.</span>
            </div>
          )}
        </section>

        {/* Interactive SVG Canvas */}
        <section className="lg:col-span-8 p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 relative min-h-[450px] flex items-center justify-center overflow-hidden">
          {/* Grid background simulation */}
          <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          {/* SVG Links */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: "450px" }}>
            {/* Draw links between nodes */}
            <line x1="120" y1="120" x2="280" y2="220" stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="420" y1="130" x2="280" y2="220" stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="280" y1="220" x2="290" y2="350" stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="120" y1="120" x2="130" y2="280" stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="130" y1="280" x2="290" y2="350" stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" />
          </svg>

          {/* Render Nodes relative positions */}
          <div className="relative w-full h-full min-h-[400px]">
            {/* Vivek Sharma */}
            <div 
              onClick={() => handleNodeClick(graphNodes[0])}
              className="absolute left-[80px] top-[80px] px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-violet-500 cursor-pointer flex items-center gap-2 text-xs transition-all shadow-lg hover:scale-105"
            >
              <User className="w-3.5 h-3.5 text-violet-400" />
              <span className="font-semibold text-white">Vivek Sharma</span>
            </div>

            {/* Alex Rivera */}
            <div 
              onClick={() => handleNodeClick(graphNodes[1])}
              className="absolute left-[380px] top-[90px] px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-violet-500 cursor-pointer flex items-center gap-2 text-xs transition-all shadow-lg hover:scale-105"
            >
              <User className="w-3.5 h-3.5 text-violet-400" />
              <span className="font-semibold text-white">Alex Rivera</span>
            </div>

            {/* Auth Migration */}
            <div 
              onClick={() => handleNodeClick(graphNodes[2])}
              className="absolute left-[220px] top-[180px] px-4 py-2.5 rounded-lg bg-zinc-950 border border-violet-500/40 hover:border-violet-400 cursor-pointer flex items-center gap-2 text-xs transition-all shadow-lg hover:scale-105"
            >
              <FileText className="w-3.5 h-3.5 text-violet-400" />
              <span className="font-bold text-violet-300">Auth Migration</span>
            </div>

            {/* RecruitEase Pro */}
            <div 
              onClick={() => handleNodeClick(graphNodes[3])}
              className="absolute left-[20px] top-[240px] px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-violet-500 cursor-pointer flex items-center gap-2 text-xs transition-all shadow-lg hover:scale-105"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-semibold text-white">RecruitEase Pro</span>
            </div>

            {/* PostgreSQL */}
            <div 
              onClick={() => handleNodeClick(graphNodes[4])}
              className="absolute left-[220px] top-[310px] px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-violet-500 cursor-pointer flex items-center gap-2 text-xs transition-all shadow-lg hover:scale-105"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-white">PostgreSQL Database</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
