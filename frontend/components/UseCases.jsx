export default function UseCases(){
  const cases = [
    {title:'HCM', desc:'Employee summaries, attrition signals, org charts.'},
    {title:'SCM', desc:'Supplier health, inventory summaries, reorder alerts.'},
    {title:'ERP', desc:'Ledger summarization, invoice analysis, reconciliation help.'},
    {title:'Financials', desc:'Journal analysis, anomaly detection, KPIs.'}
  ]
  
  return (
    <section className="my-12 px-4">
      <h2 className="text-4xl font-bold mb-10 text-center bg-gradient-to-r from-purple-700 via-pink-700 to-blue-700 bg-clip-text text-transparent">
        Use Cases
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
        {cases.map((c, idx)=>(
          <div 
            key={idx} 
            className="group relative p-6 rounded-3xl transition-all duration-300 hover:scale-105"
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
            {/* Top gradient glow - color variety */}
            <div 
              className="absolute -top-px left-0 right-0 h-16 rounded-t-3xl opacity-40"
              style={{
                background: idx === 0 
                  ? 'linear-gradient(180deg, rgba(168, 85, 247, 0.4) 0%, transparent 100%)'
                  : idx === 1
                  ? 'linear-gradient(180deg, rgba(236, 72, 153, 0.4) 0%, transparent 100%)'
                  : idx === 2
                  ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.4) 0%, transparent 100%)'
                  : 'linear-gradient(180deg, rgba(34, 211, 238, 0.4) 0%, transparent 100%)',
                filter: 'blur(16px)'
              }}
            />
            
            {/* Hover gradient overlay */}
            <div 
              className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: idx === 0 
                  ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.06) 0%, rgba(236, 72, 153, 0.06) 100%)'
                  : idx === 1
                  ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.06) 0%, rgba(59, 130, 246, 0.06) 100%)'
                  : idx === 2
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(34, 211, 238, 0.06) 100%)'
                  : 'linear-gradient(135deg, rgba(34, 211, 238, 0.06) 0%, rgba(168, 85, 247, 0.06) 100%)'
              }}
            />
            
            {/* Top edge highlight */}
            <div
              className="absolute top-0 left-1/4 right-1/4 h-px opacity-70"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), transparent)'
              }}
            />
            
            {/* Content */}
            <div className="relative z-10">
              <h4 className="font-semibold text-lg mb-3 text-gray-900">
                {c.title}
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed">
                {c.desc}
              </p>
            </div>
            
            {/* Subtle top-left glow */}
            <div 
              className="absolute inset-0 rounded-3xl pointer-events-none opacity-30"
              style={{
                background: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.8), transparent 50%)'
              }}
            />
            
            {/* Bottom-right colored accent */}
            <div
              className="absolute bottom-0 right-0 w-24 h-24 rounded-3xl pointer-events-none opacity-15"
              style={{
                background: idx === 0 
                  ? 'radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.6), transparent 70%)'
                  : idx === 1
                  ? 'radial-gradient(circle at bottom right, rgba(236, 72, 153, 0.6), transparent 70%)'
                  : idx === 2
                  ? 'radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.6), transparent 70%)'
                  : 'radial-gradient(circle at bottom right, rgba(34, 211, 238, 0.6), transparent 70%)'
              }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}