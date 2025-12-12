export default function Features(){
  const items = [
    {title:'Connect Oracle Instances', desc:'Save instance URL and credentials securely and call REST APIs via MCP.'},
    {title:'GPT-style Chat', desc:'Ask questions in natural language and get summarized, actionable answers.'},
    {title:'Automate & Trigger', desc:'Generate email alerts, reports, or REST calls based on AI analysis.'},
    {title:'Secure by Design', desc:'Credentials stay on backend; prompts are sanitized and validated.'}
  ]
  
  return (
    <section className="my-16 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((it, i)=>(
          <div 
            key={i} 
            className="group relative p-8 rounded-3xl transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }}
          >
            {/* Gradient overlay on hover */}
            <div 
              className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
              }}
            />
            
            {/* Top edge highlight */}
            <div 
              className="absolute top-0 left-1/4 right-1/4 h-px opacity-50"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)'
              }}
            />
            
            {/* Content */}
            <div className="relative z-10">
              <h3 className="text-xl font-semibold mb-3 text-white">
                {it.title}
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {it.desc}
              </p>
            </div>
            
            {/* Subtle radial glow */}
            <div 
              className="absolute inset-0 rounded-3xl pointer-events-none opacity-40"
              style={{
                background: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.1), transparent 60%)'
              }}
            />
            
            {/* Bottom right accent */}
            <div 
              className="absolute bottom-0 right-0 w-32 h-32 rounded-3xl pointer-events-none opacity-20"
              style={{
                background: 'radial-gradient(circle at bottom right, rgba(139, 92, 246, 0.3), transparent 70%)'
              }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}