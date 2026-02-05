"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  ArrowRight, 
  Users, 
  Briefcase, 
  MessageSquare, 
  Shield, 
  Zap, 
  Globe,
  CheckCircle2,
  ChevronRight,
  Star,
  Building2,
  UserCheck,
  Target
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold tracking-tight">CampusLink</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#roles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                For You
              </Link>
              <Link href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Security
              </Link>
            </div>
            
            <div className="flex items-center gap-3">
              {!loading && (
                <>
                  {user ? (
                    <Button asChild className="rounded-full px-5">
                      <Link href="/dashboard">
                        Go to Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild variant="ghost" className="hidden sm:inline-flex">
                        <Link href="/login">Sign in</Link>
                      </Button>
                      <Button asChild className="rounded-full px-5">
                        <Link href="/signup">
                          Get Started
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-50" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial="initial"
            animate="animate"
            variants={stagger}
          >
            {/* Badge */}
            {/* <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              
            </motion.div> */}
            
            {/* Headline */}
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6"
            >
              Connect with your
              <span className="block mt-2 bg-gradient-to-r from-primary via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                Campus Community
              </span>
            </motion.h1>
            
            {/* Subheadline */}
            <motion.p 
              variants={fadeInUp}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              A trusted platform where students meet alumni. Find mentors, discover career opportunities, and build meaningful connections within your verified college network.
            </motion.p>
            
            {/* CTA Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/25">
                <Link href="/signup">
                  Start for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-12 text-base">
                <Link href="#features">
                  Explore Features
                </Link>
              </Button>
            </motion.div>
            
            {/* Trust indicators */}
            <motion.div variants={fadeInUp} className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>Verified Users Only</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span>ID Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span>Institution Backed</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A comprehensive platform designed to foster connections, accelerate careers, and build lasting relationships.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: "Verified Network",
                description: "Connect with verified students, alumni, and aspirants. Every user is authenticated through their institution.",
                color: "text-emerald-500",
                bg: "bg-emerald-500/10"
              },
              {
                icon: GraduationCap,
                title: "Mentorship Program",
                description: "Find mentors who've walked your path. Get guidance from experienced alumni in your field.",
                color: "text-violet-500",
                bg: "bg-violet-500/10"
              },
              {
                icon: Briefcase,
                title: "Job & Referrals",
                description: "Access exclusive job postings, internships, and referral opportunities from your alumni network.",
                color: "text-blue-500",
                bg: "bg-blue-500/10"
              },
              {
                icon: MessageSquare,
                title: "Direct Messaging",
                description: "Connect directly with mentors and peers through our secure, real-time messaging system.",
                color: "text-pink-500",
                bg: "bg-pink-500/10"
              },
              {
                icon: Target,
                title: "Community Feed",
                description: "Share achievements, milestones, and announcements. Celebrate successes together as a community.",
                color: "text-amber-500",
                bg: "bg-amber-500/10"
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description: "Your data is protected with enterprise-grade security. Full control over your privacy settings.",
                color: "text-cyan-500",
                bg: "bg-cyan-500/10"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group relative bg-background rounded-2xl border border-border p-6 hover:shadow-soft-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className={`inline-flex p-3 rounded-xl ${feature.bg} mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Built for everyone in your campus
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you're a student seeking guidance, an alumni wanting to give back, or an aspirant exploring your future college.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                role: "Students",
                tagline: "Accelerate your career",
                description: "Connect with seniors and alumni who've been in your shoes. Get career advice, mentorship, and discover opportunities that aren't advertised elsewhere.",
                features: ["Find mentors in your field", "Access exclusive job postings", "Build your professional network"],
                gradient: "from-emerald-500 to-teal-500",
                lightBg: "bg-emerald-50 dark:bg-emerald-950/20"
              },
              {
                role: "Alumni",
                tagline: "Give back to your community",
                description: "Stay connected with your alma mater. Mentor the next generation, share job openings from your company, and help shape future careers.",
                features: ["Mentor students & aspirants", "Post jobs and referrals", "Share your experience"],
                gradient: "from-violet-500 to-purple-500",
                lightBg: "bg-violet-50 dark:bg-violet-950/20"
              },
              {
                role: "Aspirants",
                tagline: "Prepare for your future",
                description: "Get authentic insights about college life before you join. Connect with current students and alumni to make informed decisions.",
                features: ["Learn about campus culture", "Get admission guidance", "Connect with current students"],
                gradient: "from-amber-500 to-orange-500",
                lightBg: "bg-amber-50 dark:bg-amber-950/20"
              },
              {
                role: "Institutions",
                tagline: "Build stronger communities",
                description: "Strengthen alumni relations and track engagement. Create a lasting network that benefits all stakeholders.",
                features: ["Manage alumni database", "Track engagement metrics", "Maintain platform integrity"],
                gradient: "from-blue-500 to-indigo-500",
                lightBg: "bg-blue-50 dark:bg-blue-950/20"
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`relative rounded-2xl ${item.lightBg} border border-border p-8 overflow-hidden`}
              >
                <div className="relative z-10">
                  <div className={`inline-flex px-3 py-1 rounded-full bg-gradient-to-r ${item.gradient} text-white text-sm font-medium mb-3`}>
                    {item.role}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{item.tagline}</p>
                  <p className="text-foreground mb-6">{item.description}</p>
                  <ul className="space-y-2">
                    {item.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 sm:py-32 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
                Enterprise-grade security for your campus
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We take security seriously. Our multi-layered verification system ensures only authentic members of your institution can access the platform.
              </p>
              <div className="space-y-4">
                {[
                  { title: "Admission Number Validation", desc: "Verified against institution records" },
                  { title: "ID Card Verification", desc: "Admin-reviewed document verification" },
                  { title: "Auto-Deactivation", desc: "Unverified accounts are automatically handled" },
                  { title: "Role-Based Access", desc: "Granular permissions for each user type" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                    <Shield className="h-32 w-32 text-primary relative z-10" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
              Ready to join your campus community?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Be part of a verified network of students, alumni, and aspirants. Start building meaningful connections today.
            </p>
            <Button asChild size="lg" className="rounded-full px-10 h-14 text-base shadow-lg shadow-primary/25">
              <Link href="/signup">
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">CampusLink</span>
            </Link>
            
            <div className="flex items-center gap-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#roles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                For You
              </Link>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign in
              </Link>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2026 CampusLink. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
