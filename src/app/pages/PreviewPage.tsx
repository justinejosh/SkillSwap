import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { ArrowRight, Zap, Users, Shield, Globe } from "lucide-react";

export default function PreviewPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* 1. NAVIGATION */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200">K</div>
          <span className="text-2xl font-black text-blue-900 tracking-tighter">Knoxite</span>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate("/login")} className="text-blue-600 font-bold">Log in</Button>
          <Button onClick={() => navigate("/signup")} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 shadow-md">Join Now</Button>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <header className="px-6 py-20 text-center max-w-5xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest">
          <Zap size={14} className="fill-blue-600" /> Peer-to-Peer Learning
        </div>
        <h1 className="text-6xl md:text-8xl font-black text-blue-950 leading-[0.9] tracking-normal">
          Don't just learn. <br />
          <div className="block h-2 md:h-4" />
          <span className="text-blue-600">Exchange.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
          The skill-swapping platform for Santa Rosa's tech community. Connect with mentors, 
          become an apprentice, and build your reputation.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Button size="lg" onClick={() => navigate("/signup")} className="w-full sm:w-auto h-16 px-10 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-200 hover:-translate-y-1 transition-all">
            Get Started Now <ArrowRight className="ml-2" />
          </Button>
        </div>
      </header>

      {/* 3. FEATURE CARDS */}
      <section className="px-6 py-8 bg-slate-50/50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <Feature 
            icon={<Users className="text-blue-600" />} 
            title="Community Driven" 
            description="Built specifically for students and professionals in the Laguna area." 
          />
          <Feature 
            icon={<Shield className="text-blue-600" />} 
            title="Reputation System" 
            description="Earn points and badges by providing high-quality mentorship to others." 
          />
          <Feature 
            icon={<Globe className="text-blue-600" />} 
            title="KnoxHub" 
            description="A centralized board to find skill requests and matches in real-time." 
          />
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow space-y-4">
      <div className="size-12 bg-blue-50 rounded-2xl flex items-center justify-center">{icon}</div>
      <h3 className="text-xl font-bold text-blue-900">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}