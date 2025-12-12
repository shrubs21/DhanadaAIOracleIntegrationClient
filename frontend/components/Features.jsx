export default function Features() {
  const items = [
    {
      title: "Connect Oracle Instances",
      desc: "Save instance URL and credentials securely and call REST APIs via MCP."
    },
    {
      title: "GPT-style Chat",
      desc: "Ask questions in natural language and get summarized, actionable answers."
    },
    {
      title: "Automate & Trigger",
      desc: "Generate email alerts, reports, or REST calls based on AI analysis."
    },
    {
      title: "Secure by Design",
      desc: "Credentials stay on backend; prompts are sanitized and validated."
    }
  ];
  
  return (
    <section className="my-20 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {items.map((it, i) => (
          <div
            key={i}
            className="group relative p-8 rounded-3xl transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: `
                0 8px 32px -8px rgba(0, 0, 0, 0.1),
                0 0 0 1px rgba(255, 255, 255, 0.5) inset,
                0 1px 2px rgba(255, 255, 255, 0.9) inset
              `
            }}
          >
            {/* Top gradient glow - subtle color hint */}
            <div 
              className="absolute -top-px left-0 right-0 h-20 rounded-t-3xl opacity-40"
              style={{
                background: i % 2 === 0 
                  ? 'linear-gradient(180deg, rgba(168, 85, 247, 0.3) 0%, transparent 100%)'
                  : 'linear-gradient(180deg, rgba(34, 211, 238, 0.3) 0%, transparent 100%)',
                filter: 'blur(20px)'
              }}
            />
            
            {/* Hover gradient overlay */}
            <div
              className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(34, 211, 238, 0.05) 100%)'
              }}
            />
            
            {/* Top edge highlight - Apple style */}
            <div
              className="absolute top-0 left-1/4 right-1/4 h-px opacity-70"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), transparent)'
              }}
            />
            
            {/* Content */}
            <div className="relative z-10">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                {it.title}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {it.desc}
              </p>
            </div>
            
            {/* Subtle radial glow top-left */}
            <div
              className="absolute inset-0 rounded-3xl pointer-events-none opacity-30"
              style={{
                background: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.8), transparent 50%)'
              }}
            />
            
            {/* Bottom-right colored accent */}
            <div
              className="absolute bottom-0 right-0 w-32 h-32 rounded-3xl pointer-events-none opacity-15"
              style={{
                background: i % 2 === 0
                  ? 'radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.6), transparent 70%)'
                  : 'radial-gradient(circle at bottom right, rgba(34, 211, 238, 0.6), transparent 70%)'
              }}
            />
            
            {/* Bottom edge subtle shadow for depth */}
            <div
              className="absolute -bottom-px left-1/4 right-1/4 h-px opacity-30"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent)'
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}