export default function LogosRow() {
  return (
    <section data-testid="logos" className="bg-[#0a0d14]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between text-white/60 text-sm">
            <span>Works with leading AI platforms</span>
            <div className="flex items-center gap-6">
              <span>OpenAI</span>
              <span>Stability</span>
              <span>Replicate</span>
              <span>HuggingFace</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
