import React from 'react';
import Link from 'next/link';
import {
  Heart,
  Shield,
  Activity,
  Users,
  Building2,
  CheckCircle2,
  Lock,
  Compass,
  ArrowRight
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SectionHeading } from '@/components/SectionHeading';
import { Button } from '@/components/Button';

export default function AboutPage() {
  const values = [
    {
      title: 'Dignity at the Kitchen Table',
      description: 'Medical care should never be cold or intimidating. We believe elderly and recuperating patients deserve respectful, unhurried clinical attention in their home comfort.',
      icon: <Heart className="w-6 h-6 text-secondary" />,
    },
    {
      title: 'Caregiver Partnership',
      description: 'Family members bear immense emotional and physical burdens. Our specialists train caregivers on mobility transfers, medication routines, and nutritional adaptations.',
      icon: <Users className="w-6 h-6 text-primary" />,
    },
    {
      title: 'Coordinated Clinical Bundling',
      description: 'Instead of forcing three separate appointments on fragile patients, our technology bundles lab tests, equipment delivery, and safety audits into a single coordinated visit.',
      icon: <Activity className="w-6 h-6 text-secondary" />,
    },
    {
      title: 'Rigorous Verification & Safety',
      description: 'Every phlebotomist, physiotherapist, dietitian, and technician undergoes credential authentication and background checks before entering a home.',
      icon: <Shield className="w-6 h-6 text-primary" />,
    },
  ];

  const faqs = [
    {
      q: 'Is VivoQuest affiliated with the Ministry of Health or eSanjeevani?',
      a: 'No. VivoQuest is an independent technology marketplace inspired by the accessibility standards of national health initiatives, but operates as a private coordination platform connecting independent licensed specialists and equipment depots.',
    },
    {
      q: 'How are clinical professionals verified on VivoQuest?',
      a: 'All healthcare professionals must submit state council registration numbers, degree credentials, police background checks, and identity proofs before being matched with any patient visit.',
    },
    {
      q: 'How does VivoQuest ensure patient data privacy?',
      a: 'VivoQuest adheres to the India Digital Personal Data Protection Act (DPDP Act 2023). All health data resides strictly within AWS Mumbai (ap-south-1) with AES-256 KMS encryption at rest and TLS 1.3 in transit.',
    },
    {
      q: 'What is a "Super-Visit Bundle"?',
      a: 'A Super-Visit Bundle combines multiple complementary care needs into one visit. For example, a single certified professional or coordinated team will draw blood for an A1C test, complete a home fall-risk safety audit, and set up an assistive walker in the same scheduled time window.',
    },
  ];

  return (
    <div className="w-full bg-background min-h-screen flex flex-col font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="w-full py-16 md:py-24 bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-light text-primary border border-primary/20 text-xs font-semibold mb-6">
            <Heart size={14} className="text-secondary" />
            <span>Our Healthcare Mission</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-navy tracking-tight leading-tight mb-6">
            Transforming Preventive Healthcare into Compassionate Home Delivery
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            VivoQuest is an India-focused, AI-enabled healthcare marketplace connecting patients, families, healthcare professionals, hospitals, and medical equipment suppliers through coordinated, closed-loop delivery.
          </p>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="w-full py-16 md:py-20 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Foundational Values"
            badgeColor="green"
            title="The Principles That Guide Every Home Visit"
            subtitle="Inspired by compassionate palliative care models and clinical rigor, our platform was built around human dignity."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {values.map((val, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-7 bg-white rounded-3xl border border-border shadow-card flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-background border border-border/80 flex items-center justify-center mb-5">
                    {val.icon}
                  </div>
                  <h3 className="text-lg font-bold text-navy mb-2.5">{val.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {val.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Protection & DPDP Act Statement */}
      <section id="safety" className="w-full py-16 bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-3xl bg-navy text-white border border-navy-light/40 flex flex-col md:flex-row items-center gap-8 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-white/10 text-secondary-light flex items-center justify-center shrink-0 border border-white/15">
              <Lock size={32} />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-light mb-1">
                Data Privacy &amp; Regulatory Protection
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                India DPDP Act (2023) Aligned Architecture
              </h2>
              <p className="text-sm text-white/80 leading-relaxed">
                All patient identifiers, biometrics, and medical records are stored strictly in India within AWS Mumbai (ap-south-1). We mandate explicit purpose-limited consent, ensure field workers only see task-relevant instructions, and log all data access into immutable security audit trails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full py-16 md:py-20 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Common Questions"
            badgeColor="blue"
            title="Frequently Asked Questions"
            subtitle="Transparent answers regarding our marketplace operations, clinical verification, and service coordination."
          />

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white border border-border shadow-card text-left">
                <h3 className="text-base font-bold text-navy mb-2 flex items-start gap-2.5">
                  <span className="text-primary font-bold">Q.</span>
                  <span>{faq.q}</span>
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Have specific clinical partnership questions or organizational needs?
            </p>
            <Button href="/contact" variant="primary" size="md" rightIcon={<ArrowRight size={16} />}>
              Get in Touch with our Operations Team
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
