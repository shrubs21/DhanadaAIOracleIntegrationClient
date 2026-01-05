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
  ]

  return (
    <section className="mb-8 px-4 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">
        {items.map((it, i) => (
          <div
            key={i}
            className="group relative p-8 rounded-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(229, 231, 235, 1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
            }}
          >
            {/* Blue overlay on hover */}
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(3, 4, 94, 0.08), rgba(3, 4, 94, 0.04))'
              }}
            />

            {/* Top glow on hover */}
            <div
              className="absolute -top-px left-0 right-0 h-12 rounded-t-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(180deg, rgba(3, 4, 94, 0.2) 0%, transparent 100%)',
                filter: 'blur(8px)'
              }}
            />

            {/* Content */}
            <div className="relative z-10">
              <h3 className="text-xl font-semibold mb-3 text-[#0B132B] group-hover:text-[#03045E] transition-colors duration-300">
                {it.title}
              </h3>
              <p className="text-[#475569] leading-relaxed">
                {it.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}