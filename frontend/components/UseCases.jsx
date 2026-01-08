export default function UseCases() {
  const cases = [
    { title: 'HCM', desc: 'Employee summaries, attrition signals, org charts.' },
    { title: 'SCM', desc: 'Supplier health, inventory summaries, reorder alerts.' },
    { title: 'ERP', desc: 'Ledger summarization, invoice analysis, reconciliation help.' },
    { title: 'Financials', desc: 'Journal analysis, anomaly detection, KPIs.' }
  ]

  return (
    <section className="my-12 px-4 bg-white">
      <h2 className="text-4xl font-bold mb-10 text-center text-[#0B132B]">
        Use Cases
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
        {cases.map((c, idx) => (
          <div
            key={idx}
            className="group relative p-6 rounded-2xl transition-all duration-300 hover:scale-105 bg-[#03045E] text-white shadow-lg cursor-pointer"
          >
            {/* Content */}
            <div className="relative z-10">
              <h4 className="font-semibold text-lg mb-3">
                {c.title}
              </h4>
              <p className="text-white/80 text-sm leading-relaxed">
                {c.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}