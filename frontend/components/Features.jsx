'use client'

import { motion } from 'framer-motion'

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
    <section className="mb-12 px-4 bg-white">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.12 }
          }
        }}
      >
        {items.map((it, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, y: 35, scale: 0.95 },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
              }
            }}
            whileHover={{
              scale: 1.025,
              y: -4,
              transition: { duration: 0.2, ease: 'easeOut' }
            }}
            className="group relative p-5 rounded-xl cursor-pointer overflow-hidden"
            style={{
              background: 'rgba(243, 244, 246, 0.7)',
              border: '2px solid #03045E',
              boxShadow: '0 3px 14px rgba(3,4,94,0.09)',
            }}
          >
            {/* Hover glow border */}
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{
                boxShadow: '0 0 0 2px #03045E, 0 0 20px rgba(3,4,94,0.2)',
              }}
            />

            {/* Glass shine */}
            <div
              className="absolute -top-1/2 left-0 w-full h-full opacity-30 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6), transparent)' }}
            />

            {/* Green top-left corner lines */}
            <motion.div
              className="absolute top-0 left-0 h-[3px] pointer-events-none"
              style={{ background: '#00C853', borderRadius: '0 0 4px 0', width: 40 }}
              initial={{ scaleX: 0, originX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.12 + 0.35, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute top-0 left-0 w-[3px] pointer-events-none"
              style={{ background: '#00C853', borderRadius: '0 0 4px 0', height: 28 }}
              initial={{ scaleY: 0, originY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.12 + 0.35, ease: 'easeOut' }}
            />

            {/* Hover blue tint */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(3,4,94,0.05), transparent)' }}
            />

            {/* Content */}
            <div className="relative z-10 flex items-start gap-4">
              {/* Number */}
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                style={{ background: '#03045E' }}
              >
                {i + 1}
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1.5 text-[#0B132B] group-hover:text-[#03045E] transition-colors duration-300">
                  {it.title}
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  {it.desc}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}