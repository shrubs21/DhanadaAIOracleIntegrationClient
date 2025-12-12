export default function UseCases(){
  const cases = [
    {title:'HCM', desc:'Employee summaries, attrition signals, org charts.'},
    {title:'SCM', desc:'Supplier health, inventory summaries, reorder alerts.'},
    {title:'ERP', desc:'Ledger summarization, invoice analysis, reconciliation help.'},
    {title:'Financials', desc:'Journal analysis, anomaly detection, KPIs.'}
  ]
  
  return (
    <section className="my-12 px-4">
      <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
        Use Cases
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cases.map((c, idx)=>(
          <div 
            key={idx} 
            className="group relative p-6 rounded-2xl transition-all duration-300 hover:scale-105"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }}
          >
            {/* Gradient overlay on hover */}
            <div 
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
              }}
            />
            
            {/* Content */}
            <div className="relative z-10">
              <h4 className="font-semibold text-lg mb-3 text-white">
                {c.title}
              </h4>
              <p className="text-gray-300 text-sm leading-relaxed">
                {c.desc}
              </p>
            </div>
            
            {/* Subtle inner glow */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 50%)'
              }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}