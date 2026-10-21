/**
 * Centralized Site and Footer Configuration for VivoQuest
 * 
 * Keep company details, verified routes, contact information,
 * and official social media URLs centralized in this file.
 */

export interface SocialLink {
  id: 'whatsapp' | 'instagram' | 'facebook' | 'linkedin';
  name: string;
  url: string;
  ariaLabel: string;
  isConfigured: boolean;
}

export const siteConfig = {
  brand: {
    name: 'VivoQuest',
    tagline: 'Care at Kitchen Table',
    legalName: 'VivoQuest Health Technologies Pvt. Ltd',
    description:
      'VivoQuest connects patients, healthcare professionals, hospitals, diagnostic services, and medical equipment providers through a coordinated home healthcare marketplace.',
    disclaimer:
      'VivoQuest is an independent technology coordination platform connecting patients with independent, licensed specialists and medical depots. Not affiliated with government health ministries.',
  },

  contact: {
    // Verified official contact channels.
    // Configure via environment variables or set here when verified.
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '',
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '',
    address: process.env.NEXT_PUBLIC_OFFICE_ADDRESS || '',
    contactRoute: '/contact',
    emergencyNotice: 'Emergency: Dial 112 / 108. VivoQuest provides scheduled, non-emergency home health.',
  },

  social: {
    // Official profiles. Only verified URLs will be rendered.
    // Configure via environment variables or update directly when accounts are active.
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
      ? `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER.replace(/\D/g, '')}`
      : (process.env.NEXT_PUBLIC_WHATSAPP_URL || ''),
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '',
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || '',
    linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL || '',
  },

  links: {
    explore: [
      { label: 'Home', href: '/' },
      { label: 'About VivoQuest', href: '/about' },
      { label: 'Healthcare Services', href: '/services' },
      { label: 'Find a Doctor', href: '/doctors' },
      { label: 'Appointments', href: '/appointments' },
      { label: 'Medical Store', href: '/products' },
      { label: 'My Orders', href: '/orders' },
      { label: 'Contact Us', href: '/contact' },
    ],

    services: [
      { label: 'Home Diagnostics & Blood Draws', href: '/services#home-diagnostics' },
      { label: 'Physiotherapy & Rehabilitation', href: '/services#physiotherapy' },
      { label: 'Doctor & Specialist Consultations', href: '/doctors' },
      { label: 'Clinical Nutrition & Dietetics', href: '/services#nutrition-wellness' },
      { label: 'Post-Discharge Home Care', href: '/services#preventive-home-care' },
      { label: 'Medical Equipment (DME)', href: '/products' },
      { label: 'AI Care Coordination', href: '/clinical' },
    ],

    joinNetwork: [
      { label: 'Join as a Healthcare Professional', href: '/professionals' },
      { label: 'Register as a Diagnostic Partner', href: '/professionals#enroll' },
      { label: 'Partner as a Hospital or Institution', href: '/contact?subject=Hospital+Partnership' },
      { label: 'Join as a Medical Equipment Supplier', href: '/professionals' },
      { label: 'Hospital & Care Partners Portal', href: '/hospital/dashboard' },
      { label: 'Doctor & Specialist Portal', href: '/doctor/dashboard' },
    ],

    visit: [
      { label: 'Visit Our Web Platform', href: '/' },
      { label: 'Contact Our Operations Desk', href: '/contact' },
      { label: 'Hospital & Institutional Partnerships', href: '/contact?subject=Institutional+Partnership' },
      { label: 'Request a Business Meeting', href: '/contact?subject=Business+Meeting' },
    ],

    legal: [
      { label: 'Privacy Notice', href: '/about#privacy' },
      { label: 'Terms of Service', href: '/about#terms' },
      { label: 'Safety Guardrails', href: '/about#safety' },
      { label: 'Contact Coordination Desk', href: '/contact' },
    ],
  },
};
