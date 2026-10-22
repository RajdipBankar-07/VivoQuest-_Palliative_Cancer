'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../../components/AppLayout';
import { 
  ChevronLeft, 
  Check, 
  Sparkles, 
  Lock, 
  Upload, 
  Save, 
  RefreshCw, 
  X, 
  Award, 
  User, 
  Star,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiBaseUrl } from '@/lib/api';

const API_BASE = getApiBaseUrl();


// Custom SVG Avatar layered renderer component
function AvatarPreview({ 
  skinTone, 
  hairStyle, 
  hairColor, 
  eyeColor, 
  beard, 
  outfit, 
  accessories = [], 
  avatarFrame,
  faceType = 'Round Face'
}: {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  beard: string;
  outfit: string;
  accessories: string[];
  avatarFrame: string;
  faceType?: string;
}) {
  const hasCap = accessories.includes('Sports Red Cap') || accessories.includes('Cricket Helmet');

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-full h-full select-none rounded-[28px] overflow-hidden shadow-2xl">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0f0b29" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <rect width="200" height="200" fill="url(#bgGrad)" />

      {/* Neck */}
      <rect x="85" y="145" width="30" height="25" fill={skinTone} stroke="#4a3b32" strokeWidth="2.5" />
      
      {/* Head & Ears */}
      {faceType === 'Sharp Jaw' ? (
        <path d="M 45,90 C 45,50 155,50 155,90 C 155,125 125,160 100,165 C 75,160 45,125 45,90 Z" fill={skinTone} stroke="#4a3b32" strokeWidth="2.5" />
      ) : faceType === 'Oval Contour' ? (
        <ellipse cx="100" cy="100" rx="50" ry="68" fill={skinTone} stroke="#4a3b32" strokeWidth="2.5" />
      ) : (
        <ellipse cx="100" cy="100" rx="55" ry="65" fill={skinTone} stroke="#4a3b32" strokeWidth="2.5" />
      )}
      <circle cx="40" cy="100" r="12" fill={skinTone} stroke="#4a3b32" strokeWidth="2.5" />
      <circle cx="160" cy="100" r="12" fill={skinTone} stroke="#4a3b32" strokeWidth="2.5" />

      {/* Eyes */}
      <ellipse cx="80" cy="90" rx="9" ry="6" fill="#ffffff" stroke="#4a3b32" strokeWidth="2" />
      <circle cx="80" cy="90" r="4.5" fill={eyeColor} />
      <circle cx="82" cy="88" r="1.5" fill="#ffffff" />
      
      <ellipse cx="120" cy="90" rx="9" ry="6" fill="#ffffff" stroke="#4a3b32" strokeWidth="2" />
      <circle cx="120" cy="90" r="4.5" fill={eyeColor} />
      <circle cx="122" cy="88" r="1.5" fill="#ffffff" />

      {/* Eyebrows */}
      <path d="M 68,80 Q 80,76 92,82" stroke="#332211" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 108,82 Q 120,76 132,80" stroke="#332211" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Nose */}
      <path d="M 97,95 L 100,105 L 105,105" stroke="#4a3b32" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Mouth / Smile */}
      <path d="M 88,120 Q 100,130 112,120" stroke="#4a3b32" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Beard & Facial Hair */}
      {beard === 'Full Beard' && (
        <>
          <path d="M 45,95 C 45,145 155,145 155,95 C 145,110 135,115 120,118 C 105,120 95,120 80,118 C 65,115 55,110 45,95 Z" fill={hairColor} stroke="#221105" strokeWidth="1" />
          <path d="M 78,112 Q 100,105 122,112 Q 100,118 78,112 Z" fill={hairColor} />
        </>
      )}
      {beard === 'Goatee' && (
        <path d="M 85,115 C 85,145 115,145 115,115 Q 100,122 85,115 Z" fill={hairColor} stroke="#221105" strokeWidth="1" />
      )}
      {beard === 'Mustache Only' && (
        <path d="M 80,112 Q 100,104 120,112 Q 100,118 80,112 Z" fill={hairColor} />
      )}

      {/* Hair Styles */}
      {hasCap ? (
        <>
          {hairStyle === 'Short Trim' && (
            <>
              <path d="M 43,85 L 45,98 L 50,98 L 48,82 Z" fill={hairColor} stroke="#221105" strokeWidth="1" />
              <path d="M 157,85 L 155,98 L 150,98 L 152,82 Z" fill={hairColor} stroke="#221105" strokeWidth="1" />
            </>
          )}
          {hairStyle === 'Ponytail' && (
            <>
              <path d="M 148,80 C 170,80 180,110 168,125 C 160,115 155,100 150,90 Z" fill={hairColor} stroke="#221105" strokeWidth="1.5" />
              <circle cx="151" cy="85" r="5" fill="#e11d48" />
              <path d="M 43,85 L 45,98 L 50,98 L 48,82 Z" fill={hairColor} stroke="#221105" strokeWidth="1" />
              <path d="M 157,85 L 155,98 L 150,98 L 152,82 Z" fill={hairColor} stroke="#221105" strokeWidth="1" />
            </>
          )}
          {hairStyle === 'Spiky Edge' && (
            <>
              <path d="M 43,85 L 45,98 L 50,98 L 48,82 Z" fill={hairColor} stroke="#221105" strokeWidth="1" />
              <path d="M 157,85 L 155,98 L 150,98 L 152,82 Z" fill={hairColor} stroke="#221105" strokeWidth="1" />
            </>
          )}
          {hairStyle === 'Curly Wave' && (
            <>
              <path d="M 43,80 C 35,85 38,95 45,100 C 42,92 45,85 43,80 Z" fill={hairColor} stroke="#221105" strokeWidth="1" />
              <path d="M 157,80 C 165,85 162,95 155,100 C 158,92 155,85 157,80 Z" fill={hairColor} stroke="#221105" strokeWidth="1" />
            </>
          )}
          {hairStyle === 'Bob Cut' && (
            <>
              <path d="M 43,80 C 38,90 36,105 38,115 C 44,115 48,105 48,90 Z" fill={hairColor} stroke="#221105" strokeWidth="1.5" />
              <path d="M 157,80 C 162,90 164,105 162,115 C 156,115 152,105 152,90 Z" fill={hairColor} stroke="#221105" strokeWidth="1.5" />
            </>
          )}
        </>
      ) : (
        <>
          {hairStyle === 'Short Trim' && (
            <path d="M 42,90 C 42,50 158,50 158,90 C 158,85 145,75 130,70 C 100,60 70,70 58,75 C 48,78 42,85 42,90 Z" fill={hairColor} stroke="#221105" strokeWidth="1.5" />
          )}
          {hairStyle === 'Ponytail' && (
            <>
              <path d="M 148,80 C 170,80 180,110 168,125 C 160,115 155,100 150,90 Z" fill={hairColor} stroke="#221105" strokeWidth="1.5" />
              <path d="M 45,85 C 45,45 155,45 155,85 C 150,80 130,70 100,70 C 70,70 50,80 45,85 Z" fill={hairColor} stroke="#221105" strokeWidth="1.5" />
              <circle cx="151" cy="85" r="5" fill="#e11d48" />
            </>
          )}
          {hairStyle === 'Spiky Edge' && (
            <path d="M 42,90 C 40,75 48,65 52,60 L 60,45 L 72,52 L 85,38 L 98,50 L 112,35 L 128,52 L 140,42 L 148,58 L 158,70 C 160,80 158,90 158,90 Z" fill={hairColor} stroke="#221105" strokeWidth="1.5" />
          )}
          {hairStyle === 'Curly Wave' && (
            <path d="M 42,90 C 35,80 40,65 48,55 C 55,45 70,45 80,50 C 90,45 105,42 115,48 C 125,44 140,46 148,55 C 158,65 162,80 158,90 C 150,85 145,80 135,82 C 125,84 120,78 110,80 C 100,82 90,75 80,78 C 70,80 60,78 50,82 Z" fill={hairColor} stroke="#221105" strokeWidth="1.5" />
          )}
          {hairStyle === 'Bob Cut' && (
            <path d="M 40,90 C 40,40 160,40 160,90 L 164,115 C 164,115 154,120 148,110 L 142,95 C 142,95 110,80 100,80 C 90,80 58,95 58,95 L 52,110 C 46,120 36,115 36,115 Z" fill={hairColor} stroke="#221105" strokeWidth="1.5" />
          )}
        </>
      )}

      {/* Outfit / Clothes */}
      {outfit === 'Casual Tee & Denim' && (
        <>
          <path d="M 40,165 L 160,165 L 180,220 L 145,220 L 140,195 L 60,195 L 55,220 L 20,220 Z" fill="#2563eb" stroke="#1e3a8a" strokeWidth="2" />
          <path d="M 85,165 Q 100,185 115,165 Z" fill={skinTone} stroke="#4a3b32" strokeWidth="2.5" />
        </>
      )}
      {outfit === 'Corporate Suit & Blazer' && (
        <>
          <path d="M 40,165 L 160,165 L 180,220 L 20,220 Z" fill="#ffffff" />
          <path d="M 85,165 L 100,190 L 115,165 Z" fill="#e11d48" />
          <path d="M 97,190 L 100,220 L 103,220 Z" fill="#e11d48" />
          <path d="M 40,165 L 85,185 L 85,220 L 20,220 Z" fill="#374151" stroke="#1f2937" strokeWidth="2" />
          <path d="M 160,165 L 115,185 L 115,220 L 180,220 Z" fill="#374151" stroke="#1f2937" strokeWidth="2" />
        </>
      )}
      {outfit === 'Traditional Kurta' && (
        <>
          <path d="M 40,165 L 160,165 L 180,220 L 20,220 Z" fill="#d97706" stroke="#b45309" strokeWidth="2" />
          <path d="M 97,165 L 97,205" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="100" cy="175" r="2" fill="#000000" />
          <circle cx="100" cy="188" r="2" fill="#000000" />
          <circle cx="100" cy="200" r="2" fill="#000000" />
        </>
      )}
      {outfit === 'India Cricket Jersey' && (
        <>
          <path d="M 40,165 L 160,165 L 180,220 L 55,220 L 20,220 Z" fill="#0b3c95" stroke="#062263" strokeWidth="2" />
          <path d="M 40,165 L 55,220" stroke="#f97316" strokeWidth="8" />
          <path d="M 160,165 L 145,220" stroke="#f97316" strokeWidth="8" />
          <path d="M 85,165 Q 100,185 115,165 Z" fill={skinTone} stroke="#4a3b32" strokeWidth="2.5" />
          <text x="100" y="205" fill="#f97316" fontSize="12" fontWeight="900" textAnchor="middle" letterSpacing="1.5">INDIA</text>
        </>
      )}
      {outfit === 'Basketball Kit' && (
        <>
          <path d="M 55,165 L 145,165 L 155,220 L 45,220 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
          <path d="M 80,165 Q 100,180 120,165 Z" fill={skinTone} stroke="#4a3b32" strokeWidth="2.5" />
          <text x="100" y="200" fill="#facc15" fontSize="16" fontWeight="900" textAnchor="middle">07</text>
        </>
      )}
      {outfit === 'Running Kit & Tracksuit' && (
        <>
          <path d="M 40,165 L 160,165 L 180,220 L 20,220 Z" fill="#10b981" stroke="#047857" strokeWidth="2" />
          <rect x="23" y="188" width="154" height="8" fill="#ffffff" />
          <path d="M 85,165 Q 100,185 115,165 Z" fill={skinTone} stroke="#4a3b32" strokeWidth="2.5" />
        </>
      )}
      {outfit === 'Gym Outfit' && (
        <>
          <path d="M 40,165 L 160,165 L 180,220 L 20,220 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
          <rect x="23" y="188" width="154" height="8" fill="#facc15" />
          <path d="M 85,165 Q 100,185 115,165 Z" fill={skinTone} stroke="#4a3b32" strokeWidth="2.5" />
        </>
      )}

      {/* Accessories overlay */}
      {accessories.includes('Clear Glasses') && (
        <>
          <circle cx="80" cy="90" r="14" fill="none" stroke="#000000" strokeWidth="3" opacity="0.8" />
          <circle cx="120" cy="90" r="14" fill="none" stroke="#000000" strokeWidth="3" opacity="0.8" />
          <path d="M 94,90 L 106,90" stroke="#000000" strokeWidth="3" />
          <path d="M 66,90 L 55,85" stroke="#000000" strokeWidth="2.5" />
          <path d="M 134,90 L 145,85" stroke="#000000" strokeWidth="2.5" />
        </>
      )}
      {accessories.includes('Black Aviators') && (
        <>
          <path d="M 65,85 L 95,87 L 90,105 C 75,108 65,95 65,85 Z" fill="#111827" stroke="#4b5563" strokeWidth="1.5" />
          <path d="M 135,85 L 105,87 L 110,105 C 125,108 135,95 135,85 Z" fill="#111827" stroke="#4b5563" strokeWidth="1.5" />
          <path d="M 95,87 L 105,87" stroke="#111827" strokeWidth="3" />
          <path d="M 65,85 L 55,82" stroke="#111827" strokeWidth="2" />
          <path d="M 135,85 L 145,82" stroke="#111827" strokeWidth="2" />
        </>
      )}
      {accessories.includes('Sports Red Cap') && (
        <>
          {/* Cap Dome */}
          <path d="M 44,85 C 42,15 158,15 156,85 Z" fill="#dc2626" stroke="#991b1b" strokeWidth={2} />
          {/* Cap Visor (sideways / tilted look) */}
          <path d="M 42,83 Q 100,74 158,83 Q 178,88 182,93 Q 165,102 148,93 Q 100,85 42,83 Z" fill="#b91c1c" stroke="#7f1d1d" strokeWidth={1.5} />
          {/* Button on top */}
          <circle cx="100" cy="36" r="5" fill="#facc15" stroke="#d97706" strokeWidth={1} />
        </>
      )}
      {accessories.includes('Cricket Helmet') && (
        <>
          {/* Helmet Dome */}
          <path d="M 44,80 C 42,15 158,15 156,80 C 156,95 44,95 44,80 Z" fill="#1e3a8a" stroke="#111827" strokeWidth={2} />
          {/* Ear Guards */}
          <path d="M 44,80 L 49,110 L 65,110 Z" fill="#1e3a8a" stroke="#111827" strokeWidth={2} />
          <path d="M 156,80 L 151,110 L 135,110 Z" fill="#1e3a8a" stroke="#111827" strokeWidth={2} />
          {/* Grill / Guard Rails */}
          <path d="M 49,95 L 151,95" stroke="#9ca3af" strokeWidth={4} strokeLinecap="round" />
          <path d="M 51,108 L 149,108" stroke="#9ca3af" strokeWidth={3} strokeLinecap="round" />
          <path d="M 65,95 L 65,120 L 75,120 L 75,95" fill="none" stroke="#9ca3af" strokeWidth={3} strokeLinecap="round" />
          <path d="M 135,95 L 135,120 L 125,120 L 125,95" fill="none" stroke="#9ca3af" strokeWidth={3} strokeLinecap="round" />
        </>
      )}
      {accessories.includes('Smart Sports Watch') && (
        <>
          <rect x="85" y="150" width="30" height="4" fill="#06b6d4" />
          <circle cx="100" cy="152" r="3" fill="#ffffff" />
        </>
      )}

      {/* Achievement Frames */}
      {avatarFrame === 'Gold Champion Frame' && (
        <>
          <rect x="4" y="4" width="192" height="192" rx="28" fill="none" stroke="#fbbf24" strokeWidth="8" />
          <rect x="8" y="8" width="184" height="184" rx="24" fill="none" stroke="#d97706" strokeWidth="2" />
          <polygon points="20,12 23,19 30,20 25,25 26,32 20,28 14,32 15,25 10,20 17,19" fill="#fbbf24" />
          <polygon points="180,12 183,19 190,20 185,25 186,32 180,28 174,32 175,25 170,20 177,19" fill="#fbbf24" />
        </>
      )}
      {avatarFrame === 'AI Coach Buddy Frame' && (
        <>
          <rect x="4" y="4" width="192" height="192" rx="28" fill="none" stroke="#22d3ee" strokeWidth="6" />
          <path d="M 4,40 L 4,4 L 40,4" fill="none" stroke="#3b82f6" strokeWidth="8" />
          <path d="M 196,40 L 196,4 L 160,4" fill="none" stroke="#3b82f6" strokeWidth="8" />
          <path d="M 4,160 L 4,196 L 40,196" fill="none" stroke="#3b82f6" strokeWidth="8" />
          <path d="M 196,160 L 196,196 L 160,196" fill="none" stroke="#3b82f6" strokeWidth="8" />
        </>
      )}
      {avatarFrame === 'Standard Frame' && (
        <rect x="5" y="5" width="190" height="190" rx="25" fill="none" stroke="#6b7280" strokeWidth="3" />
      )}
    </svg>
  );
}

// Generate the raw SVG String to send as Base64 image
const serializeSvg = (params: any) => {
  const { skinTone, hairStyle, hairColor, eyeColor, beard, outfit, accessories, avatarFrame, faceType } = params;
  
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">`;
  s += `<defs><linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1e1b4b" /><stop offset="100%" stop-color="#0f0b29" /></linearGradient></defs>`;
  s += `<rect width="200" height="200" fill="url(#bgG)" />`;
  s += `<rect x="85" y="145" width="30" height="25" fill="${skinTone}" stroke="#4a3b32" stroke-width="2.5" />`;
  
  if (faceType === 'Sharp Jaw') {
    s += `<path d="M 45,90 C 45,50 155,50 155,90 C 155,125 125,160 100,165 C 75,160 45,125 45,90 Z" fill="${skinTone}" stroke="#4a3b32" stroke-width="2.5" />`;
  } else if (faceType === 'Oval Contour') {
    s += `<ellipse cx="100" cy="100" rx="50" ry="68" fill="${skinTone}" stroke="#4a3b32" stroke-width="2.5" />`;
  } else {
    s += `<ellipse cx="100" cy="100" rx="55" ry="65" fill="${skinTone}" stroke="#4a3b32" stroke-width="2.5" />`;
  }
  
  s += `<circle cx="40" cy="100" r="12" fill="${skinTone}" stroke="#4a3b32" stroke-width="2.5" />`;
  s += `<circle cx="160" cy="100" r="12" fill="${skinTone}" stroke="#4a3b32" stroke-width="2.5" />`;
  s += `<ellipse cx="80" cy="90" rx="9" ry="6" fill="#ffffff" stroke="#4a3b32" stroke-width="2" />`;
  s += `<circle cx="80" cy="90" r="4.5" fill="${eyeColor}" />`;
  s += `<circle cx="82" cy="88" r="1.5" fill="#ffffff" />`;
  s += `<ellipse cx="120" cy="90" rx="9" ry="6" fill="#ffffff" stroke="#4a3b32" stroke-width="2" />`;
  s += `<circle cx="120" cy="90" r="4.5" fill="${eyeColor}" />`;
  s += `<circle cx="122" cy="88" r="1.5" fill="#ffffff" />`;
  s += `<path d="M 68,80 Q 80,76 92,82" stroke="#332211" stroke-width="3" fill="none" stroke-linecap="round" />`;
  s += `<path d="M 108,82 Q 120,76 132,80" stroke="#332211" stroke-width="3" fill="none" stroke-linecap="round" />`;
  s += `<path d="M 97,95 L 100,105 L 105,105" stroke="#4a3b32" stroke-width="2" fill="none" stroke-linecap="round" />`;
  s += `<path d="M 88,120 Q 100,130 112,120" stroke="#4a3b32" stroke-width="2.5" fill="none" stroke-linecap="round" />`;

  if (beard === 'Full Beard') {
    s += `<path d="M 45,95 C 45,145 155,145 155,95 C 145,110 135,115 120,118 C 105,120 95,120 80,118 C 65,115 55,110 45,95 Z" fill="${hairColor}" stroke="#221105" stroke-width="1" />`;
    s += `<path d="M 78,112 Q 100,105 122,112 Q 100,118 78,112 Z" fill="${hairColor}" />`;
  } else if (beard === 'Goatee') {
    s += `<path d="M 85,115 C 85,145 115,145 115,115 Q 100,122 85,115 Z" fill="${hairColor}" stroke="#221105" stroke-width="1" />`;
  } else if (beard === 'Mustache Only') {
    s += `<path d="M 80,112 Q 100,104 120,112 Q 100,118 80,112 Z" fill="${hairColor}" />`;
  }

  const hasCap = accessories.includes('Sports Red Cap') || accessories.includes('Cricket Helmet');
  if (hasCap) {
    if (hairStyle === 'Short Trim') {
      s += `<path d="M 43,85 L 45,98 L 50,98 L 48,82 Z" fill="${hairColor}" stroke="#221105" stroke-width="1" />`;
      s += `<path d="M 157,85 L 155,98 L 150,98 L 152,82 Z" fill="${hairColor}" stroke="#221105" stroke-width="1" />`;
    } else if (hairStyle === 'Ponytail') {
      s += `<path d="M 148,80 C 170,80 180,110 168,125 C 160,115 155,100 150,90 Z" fill="${hairColor}" stroke="#221105" stroke-width="1.5" />`;
      s += `<circle cx="151" cy="85" r="5" fill="#e11d48" />`;
      s += `<path d="M 43,85 L 45,98 L 50,98 L 48,82 Z" fill="${hairColor}" stroke="#221105" stroke-width="1" />`;
      s += `<path d="M 157,85 L 155,98 L 150,98 L 152,82 Z" fill="${hairColor}" stroke="#221105" stroke-width="1" />`;
    } else if (hairStyle === 'Spiky Edge') {
      s += `<path d="M 43,85 L 45,98 L 50,98 L 48,82 Z" fill="${hairColor}" stroke="#221105" stroke-width="1" />`;
      s += `<path d="M 157,85 L 155,98 L 150,98 L 152,82 Z" fill="${hairColor}" stroke="#221105" stroke-width="1" />`;
    } else if (hairStyle === 'Curly Wave') {
      s += `<path d="M 43,80 C 35,85 38,95 45,100 C 42,92 45,85 43,80 Z" fill="${hairColor}" stroke="#221105" stroke-width="1" />`;
      s += `<path d="M 157,80 C 165,85 162,95 155,100 C 158,92 155,85 157,80 Z" fill="${hairColor}" stroke="#221105" stroke-width="1" />`;
    } else if (hairStyle === 'Bob Cut') {
      s += `<path d="M 43,80 C 38,90 36,105 38,115 C 44,115 48,105 48,90 Z" fill="${hairColor}" stroke="#221105" stroke-width="1.5" />`;
      s += `<path d="M 157,80 C 162,90 164,105 162,115 C 156,115 152,105 152,90 Z" fill="${hairColor}" stroke="#221105" stroke-width="1.5" />`;
    }
  } else {
    if (hairStyle === 'Short Trim') {
      s += `<path d="M 42,90 C 42,50 158,50 158,90 C 158,85 145,75 130,70 C 100,60 70,70 58,75 C 48,78 42,85 42,90 Z" fill="${hairColor}" stroke="#221105" stroke-width="1.5" />`;
    } else if (hairStyle === 'Ponytail') {
      s += `<path d="M 148,80 C 170,80 180,110 168,125 C 160,115 155,100 150,90 Z" fill="${hairColor}" stroke="#221105" stroke-width="1.5" />`;
      s += `<path d="M 45,85 C 45,45 155,45 155,85 C 150,80 130,70 100,70 C 70,70 50,80 45,85 Z" fill="${hairColor}" stroke="#221105" stroke-width="1.5" />`;
      s += `<circle cx="151" cy="85" r="5" fill="#e11d48" />`;
    } else if (hairStyle === 'Spiky Edge') {
      s += `<path d="M 42,90 C 40,75 48,65 52,60 L 60,45 L 72,52 L 85,38 L 98,50 L 112,35 L 128,52 L 140,42 L 148,58 L 158,70 C 160,80 158,90 158,90 Z" fill="${hairColor}" stroke="#221105" stroke-width="1.5" />`;
    } else if (hairStyle === 'Curly Wave') {
      s += `<path d="M 42,90 C 35,80 40,65 48,55 C 55,45 70,45 80,50 C 90,45 105,42 115,48 C 125,44 140,46 148,55 C 158,65 162,80 158,90 C 150,85 145,80 135,82 C 125,84 120,78 110,80 C 100,82 90,75 80,78 C 70,80 60,78 50,82 Z" fill="${hairColor}" stroke="#221105" stroke-width="1.5" />`;
    } else if (hairStyle === 'Bob Cut') {
      s += `<path d="M 40,90 C 40,40 160,40 160,90 L 164,115 C 164,115 154,120 148,110 L 142,95 C 142,95 110,80 100,80 C 90,80 58,95 58,95 L 52,110 C 46,120 36,115 36,115 Z" fill="${hairColor}" stroke="#221105" stroke-width="1.5" />`;
    }
  }

  if (outfit === 'Casual Tee & Denim') {
    s += `<path d="M 40,165 L 160,165 L 180,220 L 145,220 L 140,195 L 60,195 L 55,220 L 20,220 Z" fill="#2563eb" stroke="#1e3a8a" stroke-width="2" />`;
    s += `<path d="M 85,165 Q 100,185 115,165 Z" fill="${skinTone}" stroke="#4a3b32" stroke-width="2.5" />`;
  } else if (outfit === 'Corporate Suit & Blazer') {
    s += `<path d="M 40,165 L 160,165 L 180,220 L 20,220 Z" fill="#ffffff" />`;
    s += `<path d="M 85,165 L 100,190 L 115,165 Z" fill="#e11d48" />`;
    s += `<path d="M 97,190 L 100,220 L 103,220 Z" fill="#e11d48" />`;
    s += `<path d="M 40,165 L 85,185 L 85,220 L 20,220 Z" fill="#374151" stroke="#1f2937" stroke-width="2" />`;
    s += `<path d="M 160,165 L 115,185 L 115,220 L 180,220 Z" fill="#374151" stroke="#1f2937" stroke-width="2" />`;
  } else if (outfit === 'Traditional Kurta') {
    s += `<path d="M 40,165 L 160,165 L 180,220 L 20,220 Z" fill="#d97706" stroke="#b45309" stroke-width="2" />`;
    s += `<path d="M 97,165 L 97,205" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />`;
    s += `<circle cx="100" cy="175" r="2" fill="#000000" />`;
    s += `<circle cx="100" cy="188" r="2" fill="#000000" />`;
    s += `<circle cx="100" cy="200" r="2" fill="#000000" />`;
  } else if (outfit === 'India Cricket Jersey') {
    s += `<path d="M 40,165 L 160,165 L 180,220 L 55,220 L 20,220 Z" fill="#0b3c95" stroke="#062263" stroke-width="2" />`;
    s += `<path d="M 40,165 L 55,220" stroke="#f97316" stroke-width="8" />`;
    s += `<path d="M 160,165 L 145,220" stroke="#f97316" stroke-width="8" />`;
    s += `<path d="M 85,165 Q 100,185 115,165 Z" fill="${skinTone}" stroke="#4a3b32" stroke-width="2.5" />`;
    s += `<text x="100" y="205" fill="#f97316" font-size="12" font-weight="900" text-anchor="middle" letter-spacing="1.5">INDIA</text>`;
  } else if (outfit === 'Basketball Kit') {
    s += `<path d="M 55,165 L 145,165 L 155,220 L 45,220 Z" fill="#dc2626" stroke="#991b1b" stroke-width="2" />`;
    s += `<path d="M 80,165 Q 100,180 120,165 Z" fill="${skinTone}" stroke="#4a3b32" stroke-width="2.5" />`;
    s += `<text x="100" y="200" fill="#facc15" font-size="16" font-weight="900" text-anchor="middle">07</text>`;
  } else if (outfit === 'Running Kit & Tracksuit') {
    s += `<path d="M 40,165 L 160,165 L 180,220 L 20,220 Z" fill="#10b981" stroke="#047857" stroke-width="2" />`;
    s += `<rect x="23" y="188" width="154" height="8" fill="#ffffff" />`;
    s += `<path d="M 85,165 Q 100,185 115,165 Z" fill="${skinTone}" stroke="#4a3b32" stroke-width="2.5" />`;
  } else {
    s += `<path d="M 40,165 L 160,165 L 180,220 L 20,220 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2" />`;
    s += `<rect x="23" y="188" width="154" height="8" fill="#facc15" />`;
    s += `<path d="M 85,165 Q 100,185 115,165 Z" fill="${skinTone}" stroke="#4a3b32" stroke-width="2.5" />`;
  }

  if (accessories.includes('Clear Glasses')) {
    s += `<circle cx="80" cy="90" r="14" fill="none" stroke="#000000" stroke-width="3" opacity="0.8" />`;
    s += `<circle cx="120" cy="90" r="14" fill="none" stroke="#000000" stroke-width="3" opacity="0.8" />`;
    s += `<path d="M 94,90 L 106,90" stroke="#000000" stroke-width="3" />`;
    s += `<path d="M 66,90 L 55,85" stroke="#000000" stroke-width="2.5" />`;
    s += `<path d="M 134,90 L 145,85" stroke="#000000" stroke-width="2.5" />`;
  } else if (accessories.includes('Black Aviators')) {
    s += `<path d="M 65,85 L 95,87 L 90,105 C 75,108 65,95 65,85 Z" fill="#111827" stroke="#4b5563" stroke-width="1.5" />`;
    s += `<path d="M 135,85 L 105,87 L 110,105 C 125,108 135,95 135,85 Z" fill="#111827" stroke="#4b5563" stroke-width="1.5" />`;
    s += `<path d="M 95,87 L 105,87" stroke="#111827" stroke-width="3" />`;
    s += `<path d="M 65,85 L 55,82" stroke="#111827" stroke-width="2" />`;
    s += `<path d="M 135,85 L 145,82" stroke="#111827" stroke-width="2" />`;
  }

  if (accessories.includes('Sports Red Cap')) {
    s += `<path d="M 44,85 C 42,15 158,15 156,85 Z" fill="#dc2626" stroke="#991b1b" stroke-width="2" />`;
    s += `<path d="M 42,83 Q 100,74 158,83 Q 178,88 182,93 Q 165,102 148,93 Q 100,85 42,83 Z" fill="#b91c1c" stroke="#7f1d1d" stroke-width="1.5" />`;
    s += `<circle cx="100" cy="36" r="5" fill="#facc15" stroke="#d97706" stroke-width="1" />`;
  } else if (accessories.includes('Cricket Helmet')) {
    s += `<path d="M 44,80 C 42,15 158,15 156,80 C 156,95 44,95 44,80 Z" fill="#1e3a8a" stroke="#111827" stroke-width="2" />`;
    s += `<path d="M 44,80 L 49,110 L 65,110 Z" fill="#1e3a8a" stroke="#111827" stroke-width="2" />`;
    s += `<path d="M 156,80 L 151,110 L 135,110 Z" fill="#1e3a8a" stroke="#111827" stroke-width="2" />`;
    s += `<path d="M 49,95 L 151,95" stroke="#9ca3af" stroke-width="4" stroke-linecap="round" />`;
    s += `<path d="M 51,108 L 149,108" stroke="#9ca3af" stroke-width="3" stroke-linecap="round" />`;
    s += `<path d="M 65,95 L 65,120 L 75,120 L 75,95" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linecap="round" />`;
    s += `<path d="M 135,95 L 135,120 L 125,120 L 125,95" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linecap="round" />`;
  }

  if (accessories.includes('Smart Sports Watch')) {
    s += `<rect x="85" y="150" width="30" height="4" fill="#06b6d4" />`;
    s += `<circle cx="100" cy="152" r="3" fill="#ffffff" />`;
  }

  if (avatarFrame === 'Gold Champion Frame') {
    s += `<rect x="4" y="4" width="192" height="192" rx="28" fill="none" stroke="#fbbf24" stroke-width="8" />`;
    s += `<rect x="8" y="8" width="184" height="184" rx="24" fill="none" stroke="#d97706" stroke-width="2" />`;
    s += `<polygon points="20,12 23,19 30,20 25,25 26,32 20,28 14,32 15,25 10,20 17,19" fill="#fbbf24" />`;
    s += `<polygon points="180,12 183,19 190,20 185,25 186,32 180,28 174,32 175,25 170,20 177,19" fill="#fbbf24" />`;
  } else if (avatarFrame === 'AI Coach Buddy Frame') {
    s += `<rect x="4" y="4" width="192" height="192" rx="28" fill="none" stroke="#22d3ee" stroke-width="6" />`;
    s += `<path d="M 4,40 L 4,4 L 40,4" fill="none" stroke="#3b82f6" stroke-width="8" />`;
    s += `<path d="M 196,40 L 196,4 L 160,4" fill="none" stroke="#3b82f6" stroke-width="8" />`;
    s += `<path d="M 4,160 L 4,196 L 40,196" fill="none" stroke="#3b82f6" stroke-width="8" />`;
    s += `<path d="M 196,160 L 196,196 L 160,196" fill="none" stroke="#3b82f6" stroke-width="8" />`;
  } else if (avatarFrame === 'Standard Frame') {
    s += `<rect x="5" y="5" width="190" height="190" rx="25" fill="none" stroke="#6b7280" stroke-width="3" />`;
  }

  s += `</svg>`;
  return s;
};

export default function AvatarStudioPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // User Stats & Plan
  const [plan, setPlan] = useState('FREE');
  const [userLevel, setUserLevel] = useState(1);
  const [userXp, setUserXp] = useState(0);

  // Avatar customization parameters
  const [avatarName, setAvatarName] = useState('My Avatar');
  const [avatarType, setAvatarType] = useState('MANUAL');
  const [skinTone, setSkinTone] = useState('#FFDBAC');
  const [hairStyle, setHairStyle] = useState('Short Trim');
  const [hairColor, setHairColor] = useState('#000000');
  const [eyeColor, setEyeColor] = useState('#000000');
  const [beard, setBeard] = useState('None');
  const [outfit, setOutfit] = useState('Casual Tee & Denim');
  const [accessories, setAccessories] = useState<string[]>([]);
  const [avatarFrame, setAvatarFrame] = useState('None');

  // Server Catalog Catalog / Inventory items
  const [catalog, setCatalog] = useState<any[]>([]);
  const [unlockedItemIds, setUnlockedItemIds] = useState<number[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'editor' | 'ai' | 'rewards'>('editor');
  const [editorSection, setEditorSection] = useState<'face' | 'hair' | 'apparel' | 'acc'>('face');

  // AI Avatar simulation states
  const [selectedAiStyle, setSelectedAiStyle] = useState('Cartoon Avatar');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiLogs, setAiLogs] = useState<string[]>([]);

  // Upgrade drawer overlay states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [upiId, setUpiId] = useState('');

  const getHeaders = () => {
    const token = localStorage.getItem('vivo_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const loadData = async () => {
    const token = localStorage.getItem('vivo_token');
    if (!token) {
      router.push('/');
      return;
    }
    
    try {
      // 1. Fetch user personalization details
      const userRes = await fetch(`${API_BASE}/api/auth/personalization/`, {
        headers: getHeaders()
      });
      if (userRes.ok) {
        const u = await userRes.json();
        setPlan(u.plan || 'FREE');
        setUserLevel(u.level || 1);
        setUserXp(u.xp || 0);
      }

      // 2. Fetch avatar configurations
      const avatarRes = await fetch(`${API_BASE}/api/auth/avatar/`, {
        headers: getHeaders()
      });
      if (avatarRes.ok) {
        const data = await avatarRes.json();
        setCatalog(data.catalog || []);
        setUnlockedItemIds(data.unlocked_item_ids || []);
        
        if (data.avatar) {
          const av = data.avatar;
          setAvatarName(av.avatar_name || 'My Avatar');
          setAvatarType(av.avatar_type || 'MANUAL');
          setSkinTone(av.skin_tone || '#FFDBAC');
          setHairStyle(av.hair_style || 'Short Trim');
          setHairColor(av.hair_color || '#000000');
          setEyeColor(av.eyeColor || av.eye_color || '#000000');
          setBeard(av.beard || 'None');
          setOutfit(av.outfit || 'Casual Tee & Denim');
          setAccessories(av.accessories || []);
          setAvatarFrame(av.avatar_frame || 'None');
          setFaceType(av.face_type || 'Round Face');
        }
      }

      // 3. Fetch profile details (to get occupation)
      const profileRes = await fetch(`${API_BASE}/api/auth/profile/`, {
        headers: getHeaders()
      });
      if (profileRes.ok) {
        const p = await profileRes.json();
        setOccupation(p.occupation || '');
      }
    } catch (e) {
      console.error(e);
      setErr('Failed to retrieve studio metadata.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const showFeedback = (text: string, isErr = false) => {
    if (isErr) {
      setErr(text);
      setMsg('');
    } else {
      setMsg(text);
      setErr('');
    }
    setTimeout(() => {
      setMsg('');
      setErr('');
    }, 4000);
  };

  // Check if item is unlocked in inventory
  const isItemUnlocked = (itemName: string) => {
    const item = catalog.find(i => i.name === itemName);
    if (!item) return true; // Standard defaults
    if (!item.is_premium && item.unlock_level <= userLevel) return true;
    return unlockedItemIds.includes(item.id);
  };

  // Handle manual option selection
  const selectItem = (itemName: string, type: 'skin' | 'hairStyle' | 'hairColor' | 'eyeColor' | 'beard' | 'outfit' | 'accessories' | 'frame' | 'face') => {
    const item = catalog.find(i => i.name === itemName);
    
    // Check if it is gated by Pro tier
    if (item && item.is_premium && plan === 'FREE') {
      setShowUpgradeModal(true);
      return;
    }

    // Check if locked by level/XP rewards and not yet unlocked
    if (item && !isItemUnlocked(itemName)) {
      setActiveTab('rewards');
      showFeedback(`"${itemName}" is locked! Unlock it from the Rewards catalog.`, true);
      return;
    }

    // Assign based on type
    if (type === 'skin') setSkinTone(itemName);
    else if (type === 'hairStyle') setHairStyle(itemName);
    else if (type === 'hairColor') setHairColor(itemName);
    else if (type === 'eyeColor') setEyeColor(itemName);
    else if (type === 'beard') setBeard(itemName);
    else if (type === 'outfit') setOutfit(itemName);
    else if (type === 'frame') setAvatarFrame(itemName);
    else if (type === 'face') setFaceType(itemName);
    else if (type === 'accessories') {
      if (accessories.includes(itemName)) {
        setAccessories(accessories.filter(a => a !== itemName));
      } else {
        // Caps/Helmets are mutually exclusive
        let list = [...accessories];
        if (itemName === 'Sports Red Cap' || itemName === 'Cricket Helmet') {
          list = list.filter(a => a !== 'Sports Red Cap' && a !== 'Cricket Helmet');
        }
        // Sunglasses / Aviators are mutually exclusive
        if (itemName === 'Clear Glasses' || itemName === 'Black Aviators') {
          list = list.filter(a => a !== 'Clear Glasses' && a !== 'Black Aviators');
        }
        setAccessories([...list, itemName]);
      }
    }
  };

  const handleSave = async () => {
    if (plan === 'FREE') {
      setShowUpgradeModal(true);
      return;
    }
    setSaving(true);
    const params = {
      skinTone, hairStyle, hairColor, eyeColor, beard, outfit, accessories, avatarFrame, faceType
    };
    
    const svgStr = serializeSvg(params);
    const base64Img = 'data:image/svg+xml;base64,' + btoa(svgStr);

    const payload = {
      avatar_name: avatarName,
      avatar_image: base64Img,
      avatar_type: avatarType,
      skin_tone: skinTone,
      hair_style: hairStyle,
      hair_color: hairColor,
      eye_color: eyeColor,
      beard: beard,
      outfit: outfit,
      accessories: accessories,
      avatar_frame: avatarFrame,
      face_type: faceType,
      occupation: occupation
    };

    try {
      const res = await fetch(`${API_BASE}/api/auth/avatar/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showFeedback('Avatar customized and saved successfully!');
        
        // Sync profile details in local storage
        localStorage.setItem('vivo_avatar_style', outfit);
        window.dispatchEvent(new Event('personalization_loaded'));
      } else {
        showFeedback('Failed to update avatar in database.', true);
      }
    } catch (e) {
      showFeedback('Network failure.', true);
    } finally {
      setSaving(false);
    }
  };

  // AI Generator simulation workflow
  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  const handleAiGenerate = async () => {
    if (plan === 'FREE') {
      setShowUpgradeModal(true);
      return;
    }
    if (!selfieFile) {
      showFeedback('Please upload a selfie photo.', true);
      return;
    }

    setAiGenerating(true);
    setAiLogs([]);

    const logMessages = [
      '🚀 Initializing Selfie Vector Engine...',
      '🔍 Identifying facial keypoint layers (128 channels)...',
      '🧬 Aligning skin texture, eye geometries, and hair parameters...',
      '🎮 Composing custom outfits: India Cricket Jersey & Helmet...',
      '🤖 Applying generative style mapping: ' + selectedAiStyle + '...',
      '🎨 Generating high fidelity vector model...',
      '✨ AI Customization successfully synthesized!'
    ];

    for (let i = 0; i < logMessages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setAiLogs(prev => [...prev, logMessages[i]]);
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/avatar/ai-generate/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ style: selectedAiStyle })
      });
      
      if (res.ok) {
        const data = await res.json();
        const p = data.avatar_params;
        setSkinTone(p.skin_tone);
        setHairStyle(p.hair_style);
        setHairColor(p.hair_color);
        setFaceType(p.face_type);
        setOutfit(p.outfit);
        setAvatarType('AI');
        
        if (selectedAiStyle.includes('Sports')) {
          setAccessories(['Cricket Helmet', 'Smart Sports Watch']);
        } else if (selectedAiStyle.includes('Fitness')) {
          setAccessories(['Smart Sports Watch']);
        } else {
          setAccessories([]);
        }
        
        showFeedback('AI generated avatar parameters loaded! Hit Save to finalize.');
      } else {
        showFeedback('AI processing encountered a database error.', true);
      }
    } catch (e) {
      showFeedback('Connection timeout.', true);
    } finally {
      setAiGenerating(false);
    }
  };

  // Catalog Item Unlock mechanism
  const handleUnlockItem = async (itemId: number, itemName: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/avatar/unlock-item/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ item_id: itemId })
      });
      if (res.ok) {
        const data = await res.json();
        setUnlockedItemIds(data.unlocked_item_ids || []);
        showFeedback(`Successfully unlocked "${itemName}"!`);
      } else {
        const data = await res.json();
        showFeedback(data.error || 'Failed to unlock item.', true);
      }
    } catch (e) {
      showFeedback('Network error.', true);
    }
  };

  // Mock Payment Upgrade system
  const handleUpgrade = async () => {
    if (!upiId) {
      setPaymentError('Please enter a valid UPI address');
      return;
    }
    setPaymentProcessing(true);
    setPaymentError('');

    try {
      const res = await fetch(`${API_BASE}/api/billing/upgrade/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ plan: 'PRO' })
      });
      if (res.ok) {
        localStorage.setItem('vivo_plan', 'PRO');
        localStorage.setItem('vivo_tier', 'PRO');
        document.cookie = `vivo_tier=PRO; path=/; max-age=2592000`;
        setPlan('PRO');
        setPaymentSuccess(true);
        setTimeout(() => {
          setShowUpgradeModal(false);
          setPaymentSuccess(false);
          setUpiId('');
          window.dispatchEvent(new Event('personalization_loaded'));
        }, 1500);
      } else {
        const data = await res.json();
        setPaymentError(data.error || 'Failed to process checkout.');
      }
    } catch (e) {
      setPaymentError('Sandbox payment gateway timed out.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const [faceType, setFaceType] = useState('Round Face'); // helper local state
  const [occupation, setOccupation] = useState(''); // helper local state

  const handleOccupationChange = (occ: string) => {
    setOccupation(occ);
    if (occ === 'Student' || occ === 'Software Engineer' || occ === 'Other Professional') {
      setOutfit('Casual Tee & Denim');
    } else if (occ === 'Teacher' || occ === 'Farmer') {
      setOutfit('Traditional Kurta');
    } else if (occ === 'Doctor' || occ === 'Business Owner') {
      setOutfit('Corporate Suit & Blazer');
    } else if (occ === 'Athlete') {
      setOutfit('Running Kit & Tracksuit');
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-xs font-bold text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          Configuring Avatar Studio environment...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .customizer-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .customizer-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .customizer-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(124, 58, 237, 0.2);
          border-radius: 9px;
        }
      `}</style>

      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/10 mb-6 select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/profile')}
            className="w-10 h-10 rounded-2xl bg-card hover:bg-secondary/40 border border-border flex items-center justify-center text-primary hover:text-foreground transition-all shadow-sm active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              Avatar Studio
            </h1>
            <p className="text-muted-foreground text-xs font-semibold">
              Design a personalized metabolic athlete character for profiles and leaderboards.
            </p>
          </div>
        </div>
        
        {plan === 'FREE' && (
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-[10px] uppercase rounded-full tracking-wider shadow-lg shadow-violet-600/20 active:scale-95 transition-all"
          >
            <Sparkles size={12} className="animate-pulse" /> Upgrade Studio
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full mb-12">
        {/* LEFT COLUMN: LIVE AVATAR PREVIEW */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-card border border-border/30 rounded-[32px] p-6 shadow-card flex flex-col justify-between items-center relative overflow-hidden h-full min-h-[400px]">
            <div className="absolute top-0 left-0 w-24 h-24 bg-violet-600/5 rounded-full blur-2xl" />
            
            <div className="w-full flex items-center justify-between mb-4 select-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/10">
                Studio View
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                <Award size={14} className="text-primary" /> Level {userLevel}
              </div>
            </div>

            {/* Live Render Area */}
            <div className="w-48 h-48 sm:w-56 sm:h-56 relative select-none">
              <AvatarPreview 
                skinTone={skinTone}
                hairStyle={hairStyle}
                hairColor={hairColor}
                eyeColor={eyeColor}
                beard={beard}
                outfit={outfit}
                accessories={accessories}
                avatarFrame={avatarFrame}
                faceType={faceType}
              />
            </div>

            {/* Customize Info & Save Button */}
            <div className="w-full mt-6 flex flex-col gap-3">
              <div className="text-center">
                <input 
                  type="text" 
                  value={avatarName}
                  onChange={e => setAvatarName(e.target.value)}
                  className="bg-transparent text-center font-extrabold text-base text-foreground focus:outline-none border-b border-dashed border-border hover:border-primary focus:border-primary px-2 py-0.5"
                  title="Rename Avatar"
                />
                <span className="block text-[9px] text-muted-foreground uppercase tracking-widest mt-1">
                  Creation Source: {avatarType} Mode
                </span>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-3.5 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                  plan === 'FREE' 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-600/10'
                    : 'bg-primary hover:bg-accent text-white'
                }`}
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Synchronizing...
                  </>
                ) : plan === 'FREE' ? (
                  <>
                    <Lock size={14} className="animate-pulse" /> Upgrade to Save Character
                  </>
                ) : (
                  <>
                    <Save size={14} /> Save Character
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TABS & EDITING OPTIONS */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Main Action Alerts */}
          {msg && (
            <div className="flex items-center gap-3 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs font-bold shadow-sm animate-scale-up select-none">
              <Check size={18} className="shrink-0 text-emerald-800" strokeWidth={3} />
              <span>{msg}</span>
            </div>
          )}
          {err && (
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl p-4 text-xs font-bold shadow-sm animate-scale-up select-none">
              <span>⚠️ {err}</span>
            </div>
          )}

          {/* Sub Navigation */}
          <div className="bg-card border border-border/30 rounded-[24px] p-1.5 shadow-sm flex gap-1 select-none">
            {[
              { id: 'editor', label: 'Manual Editor', icon: User },
              { id: 'ai', label: 'AI Selfie Generator', icon: Sparkles },
              { id: 'rewards', label: 'Rewards Catalog', icon: Award }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    active 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                  }`}
                >
                  <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="bg-card border border-border/30 rounded-[32px] p-6 md:p-8 shadow-card flex flex-col gap-5 flex-1 relative overflow-hidden min-h-[360px]">
            {/* TAB 1: MANUAL CUSTOMIZATION */}
            {activeTab === 'editor' && (
              <div className="flex flex-col gap-5 h-full animate-scale-up">
                {/* Editor Sections Navigation */}
                <div className="flex border-b border-border/40 gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground select-none">
                  {[
                    { id: 'face', label: 'Face' },
                    { id: 'hair', label: 'Hair Cut' },
                    { id: 'apparel', label: 'Apparel & Sport' },
                    { id: 'acc', label: 'Accessories' }
                  ].map(sec => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setEditorSection(sec.id as any)}
                      className={`pb-2 transition-colors relative ${
                        editorSection === sec.id ? 'text-primary font-black' : 'hover:text-foreground'
                      }`}
                    >
                      {sec.label}
                      {editorSection === sec.id && (
                        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto max-h-[300px] customizer-scrollbar pr-2 flex flex-col gap-4 text-xs font-medium">
                  {/* Face Customization */}
                  {editorSection === 'face' && (
                    <div className="flex flex-col gap-4 animate-scale-up">
                      {/* Skin Tone Swatches */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Skin Complexion</label>
                        <div className="flex flex-wrap gap-2.5">
                          {[
                            { name: 'Fair Complexion', val: '#FFDBAC' },
                            { name: 'Peach Complexion', val: '#F1C27D' },
                            { name: 'Golden Complexion', val: '#E0AC69' },
                            { name: 'Bronze Complexion', val: '#CBB6A3' },
                            { name: 'Deep Complexion', val: '#8D5524' }
                          ].map(t => (
                            <button
                              key={t.val}
                              type="button"
                              onClick={() => selectItem(t.val, 'skin')}
                              className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-115 ${
                                skinTone === t.val ? 'border-primary scale-110 shadow-md' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: t.val }}
                              title={t.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Face Shape selector */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Face Shape Structure</label>
                        <div className="grid grid-cols-3 gap-3">
                          {['Round Face', 'Sharp Jaw', 'Oval Contour'].map(item => {
                            const locked = !isItemUnlocked(item);
                            const premium = catalog.find(i=>i.name === item)?.is_premium && plan === 'FREE';
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => selectItem(item, 'face' as any)}
                                className={`py-3 px-4 border rounded-xl text-center font-bold flex items-center justify-center gap-1.5 transition-all ${
                                  faceType === item ? 'border-primary bg-secondary/35 text-primary' : 'border-border bg-background/50 hover:bg-secondary/15'
                                }`}
                              >
                                {item}
                                {(locked || premium) && <Lock size={11} className="text-muted-foreground shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Eye Color selector */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Eye Pupil Color</label>
                        <div className="flex flex-wrap gap-2.5">
                          {[
                            { name: 'Black', val: '#000000' },
                            { name: 'Dark Brown', val: '#3c2415' },
                            { name: 'Ocean Blue', val: '#1d4ed8' },
                            { name: 'Forest Green', val: '#047857' }
                          ].map(t => (
                            <button
                              key={t.val}
                              type="button"
                              onClick={() => selectItem(t.val, 'eyeColor')}
                              className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-115 ${
                                eyeColor === t.val ? 'border-primary scale-110 shadow-md' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: t.val }}
                              title={t.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Facial Hair selector */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Facial Beard & Mustache</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {['Clean Shaven', 'Full Beard', 'Goatee', 'Mustache Only'].map(item => {
                            const locked = !isItemUnlocked(item);
                            const premium = catalog.find(i=>i.name === item)?.is_premium && plan === 'FREE';
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => selectItem(item, 'beard')}
                                className={`py-3 px-2 border rounded-xl text-center font-bold flex items-center justify-center gap-1 transition-all ${
                                  beard === item ? 'border-primary bg-secondary/35 text-primary' : 'border-border bg-background/50 hover:bg-secondary/15'
                                }`}
                              >
                                {item}
                                {(locked || premium) && <Lock size={11} className="text-muted-foreground shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hair Customization */}
                  {editorSection === 'hair' && (
                    <div className="flex flex-col gap-4 animate-scale-up">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hair style Cut</label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          {['Short Trim', 'Ponytail', 'Spiky Edge', 'Curly Wave', 'Bob Cut'].map(item => {
                            const locked = !isItemUnlocked(item);
                            const premium = catalog.find(i=>i.name === item)?.is_premium && plan === 'FREE';
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => selectItem(item, 'hairStyle')}
                                className={`py-3.5 px-2 border rounded-xl text-center font-bold flex items-center justify-center gap-1 transition-all ${
                                  hairStyle === item ? 'border-primary bg-secondary/35 text-primary' : 'border-border bg-background/50 hover:bg-secondary/15'
                                }`}
                              >
                                {item}
                                {(locked || premium) && <Lock size={11} className="text-muted-foreground shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Hair Colors */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hair Dye Color</label>
                        <div className="flex flex-wrap gap-2.5">
                          {[
                            { name: 'Pitch Black', val: '#000000' },
                            { name: 'Dark Chestnut', val: '#4A3728' },
                            { name: 'Auburn Red', val: '#8B0000' },
                            { name: 'Golden Blonde', val: '#ffd700' },
                            { name: 'Silver Gray', val: '#9ca3af' }
                          ].map(t => (
                            <button
                              key={t.val}
                              type="button"
                              onClick={() => selectItem(t.val, 'hairColor')}
                              className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-115 ${
                                hairColor === t.val ? 'border-primary scale-110 shadow-md' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: t.val }}
                              title={t.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Apparel & Sport Jersey */}
                  {editorSection === 'apparel' && (
                    <div className="flex flex-col gap-4 animate-scale-up">
                      {/* Primary Occupation Dropdown */}
                      <div className="flex flex-col gap-1.5 mb-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Primary Occupation</label>
                        <select 
                          value={occupation}
                          onChange={e => handleOccupationChange(e.target.value)}
                          className="w-full px-4 py-3 bg-background border-2 border-border focus:border-primary rounded-xl font-bold outline-none transition-all cursor-pointer text-foreground"
                        >
                          <option value="">Select Occupation...</option>
                          <option value="Student">Student</option>
                          <option value="Software Engineer">Software Engineer</option>
                          <option value="Teacher">Teacher</option>
                          <option value="Doctor">Doctor</option>
                          <option value="Farmer">Farmer</option>
                          <option value="Business Owner">Business Owner</option>
                          <option value="Athlete">Athlete</option>
                          <option value="Other Professional">Other Professional</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Outfits & Suits</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            'Casual Tee & Denim', 
                            'Corporate Suit & Blazer', 
                            'Traditional Kurta',
                            'India Cricket Jersey',
                            'Basketball Kit',
                            'Running Kit & Tracksuit',
                            'Gym Outfit'
                          ].map(item => {
                            const locked = !isItemUnlocked(item);
                            const premium = catalog.find(i=>i.name === item)?.is_premium && plan === 'FREE';
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => selectItem(item, 'outfit')}
                                className={`py-3.5 px-4 border rounded-xl text-center font-bold flex items-center justify-center gap-1.5 transition-all ${
                                  outfit === item ? 'border-primary bg-secondary/35 text-primary' : 'border-border bg-background/50 hover:bg-secondary/15'
                                }`}
                              >
                                {item}
                                {(locked || premium) && <Lock size={11} className="text-muted-foreground shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Accessories */}
                  {editorSection === 'acc' && (
                    <div className="flex flex-col gap-4 animate-scale-up">
                      {/* Caps & Glasses */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Wearable Accessories</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            'Clear Glasses', 
                            'Black Aviators', 
                            'Sports Red Cap', 
                            'Cricket Helmet', 
                            'Smart Sports Watch'
                          ].map(item => {
                            const locked = !isItemUnlocked(item);
                            const premium = catalog.find(i=>i.name === item)?.is_premium && plan === 'FREE';
                            const active = accessories.includes(item);
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => selectItem(item, 'accessories')}
                                className={`py-3.5 px-3 border rounded-xl text-center font-bold flex items-center justify-center gap-1.5 transition-all ${
                                  active ? 'border-primary bg-secondary/35 text-primary' : 'border-border bg-background/50 hover:bg-secondary/15'
                                }`}
                              >
                                {item}
                                {(locked || premium) && <Lock size={11} className="text-muted-foreground shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Achievement Border frames */}
                      <div className="flex flex-col gap-2 mt-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Borders & Frames</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {['None', 'Standard Frame', 'Gold Champion Frame', 'AI Coach Buddy Frame'].map(item => {
                            const locked = !isItemUnlocked(item);
                            const premium = catalog.find(i=>i.name === item)?.is_premium && plan === 'FREE';
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => selectItem(item, 'frame')}
                                className={`py-3.5 px-2 border rounded-xl text-center font-bold flex items-center justify-center gap-1.5 transition-all ${
                                  avatarFrame === item ? 'border-primary bg-secondary/35 text-primary' : 'border-border bg-background/50 hover:bg-secondary/15'
                                }`}
                              >
                                {item}
                                {(locked || premium) && <Lock size={11} className="text-muted-foreground shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: AI AVATAR GENERATION */}
            {activeTab === 'ai' && (
              <div className="flex flex-col gap-5 h-full animate-scale-up">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Sparkles size={14} className="text-violet-400" />
                  </div>
                  <h3 className="font-extrabold text-lg text-primary-dark" style={{ fontFamily: 'var(--font-heading)' }}>
                    AI Generated Character
                  </h3>
                </div>

                {plan === 'FREE' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-[24px] bg-secondary/5 select-none">
                    <Lock size={32} className="text-violet-400 mb-3 animate-bounce" />
                    <h4 className="font-extrabold text-sm text-foreground">AI Generator is Locked</h4>
                    <p className="text-[11px] text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed font-semibold">
                      Generating avatars from selfies using the local VivoAI core requires a PRO premium subscription.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowUpgradeModal(true)}
                      className="px-6 py-2.5 bg-primary text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-accent transition-all shadow-md cursor-pointer"
                    >
                      Upgrade To Studio PRO
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col md:flex-row gap-6">
                    {/* Upload Block */}
                    <div className="flex-1 flex flex-col gap-4 text-xs font-semibold">
                      <div className="flex flex-col gap-1">
                        <label className="text-muted-foreground font-bold uppercase tracking-wider">Upload Portrait Selfie *</label>
                        <div className="border-2 border-dashed border-border/80 hover:border-primary rounded-[20px] p-5 text-center flex flex-col items-center justify-center relative cursor-pointer min-h-[140px] transition-colors">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleSelfieChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          {selfiePreview ? (
                            <img src={selfiePreview} alt="Selfie preview" className="w-24 h-24 rounded-full object-cover border-2 border-primary" />
                          ) : (
                            <>
                              <Upload size={24} className="text-primary mb-2" />
                              <span className="text-[11px] text-muted-foreground">Click or drop a clear face photo here</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-1">
                        <div className="flex flex-col gap-1">
                          <label className="text-muted-foreground font-bold uppercase tracking-wider">AI Archetype Style</label>
                          <select
                            value={selectedAiStyle}
                            onChange={e => setSelectedAiStyle(e.target.value)}
                            className="w-full px-4 py-3.5 bg-background border-2 border-border focus:border-primary rounded-xl font-bold cursor-pointer"
                          >
                            <option value="Cartoon Avatar">Cartoon Avatar</option>
                            <option value="Sports Champion Avatar">Sports Champion</option>
                            <option value="Fitness Avatar">Fitness Trainer</option>
                            <option value="Professional Avatar">Corporate Executive</option>
                            <option value="Anime Style Avatar">Anime Hero</option>
                            <option value="3D Game Style Avatar">3D Cyber Warrior</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={handleAiGenerate}
                          disabled={aiGenerating || !selfieFile}
                          className="mt-5 w-full bg-primary hover:bg-accent text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-white/10 disabled:text-white/20 disabled:cursor-not-allowed"
                        >
                          <Sparkles size={13} /> Synthesize AI
                        </button>
                      </div>
                    </div>

                    {/* Console Logs Output */}
                    <div className="w-full md:w-64 bg-[#080711] border border-white/[0.04] rounded-2xl p-4 font-mono text-[9px] text-violet-300 overflow-y-auto max-h-[220px]">
                      <div className="text-[10px] text-white/40 font-bold font-sans uppercase border-b border-white/[0.04] pb-2 mb-2 select-none">
                        AI Generator Logs
                      </div>
                      <div className="flex flex-col gap-1.5 leading-relaxed">
                        {aiLogs.length === 0 ? (
                          <div className="text-white/20 select-none italic text-center py-8">Waiting for dispatch trigger...</div>
                        ) : (
                          aiLogs.map((log, i) => <div key={i}>{log}</div>)
                        )}
                        {aiGenerating && (
                          <div className="flex items-center gap-1 text-white/30 animate-pulse mt-1 select-none">
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-ping" />
                            <span>Processing matrix layers...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: REWARDS CATALOG */}
            {activeTab === 'rewards' && (
              <div className="flex flex-col gap-5 h-full animate-scale-up">
                <div className="flex items-center justify-between gap-4 select-none">
                  <div>
                    <h3 className="font-extrabold text-lg text-primary-dark" style={{ fontFamily: 'var(--font-heading)' }}>
                      Rewards & Items Shop
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-semibold">
                      Unlock cosmetics using your metabolic Level achievements.
                    </p>
                  </div>
                  <div className="text-xs bg-violet-500/10 border border-violet-500/10 text-primary px-3 py-1.5 rounded-full font-black">
                    Level {userLevel} · {userXp} XP
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[260px] customizer-scrollbar pr-2 select-none">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {catalog.map(item => {
                      const unlocked = isItemUnlocked(item.name);
                      const levelLock = item.unlock_level > userLevel;
                      const xpLock = item.unlock_xp > userXp;
                      const isGated = item.is_premium && plan === 'FREE';

                      return (
                        <div key={item.id} className="bg-secondary/15 border border-border/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="text-[8px] font-black uppercase text-violet-400 tracking-wider">
                              {item.item_type} Style
                            </span>
                            <h4 className="font-extrabold text-foreground mt-0.5">{item.name}</h4>
                            <p className="text-[9px] text-muted-foreground mt-1 leading-none font-semibold">
                              {item.is_premium ? '★ Premium Tier ' : 'Free Core '}
                              {item.unlock_level > 1 && `· Req: Lvl ${item.unlock_level}`}
                            </p>
                          </div>
                          
                          <div>
                            {unlocked ? (
                              <span className="flex items-center gap-1 text-emerald-500 font-extrabold text-[10px]">
                                <Check size={12} strokeWidth={3} /> Unlocked
                              </span>
                            ) : isGated ? (
                              <button
                                type="button"
                                onClick={() => setShowUpgradeModal(true)}
                                className="px-3.5 py-1.5 bg-card-lime text-primary-dark text-[9px] font-black uppercase rounded-lg hover:scale-105 transition-all cursor-pointer"
                              >
                                Upgrade
                              </button>
                            ) : (levelLock || xpLock) ? (
                              <span className="text-[10px] text-muted-foreground font-black uppercase flex items-center gap-1">
                                <Lock size={11} /> Locked
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUnlockItem(item.id, item.name)}
                                className="px-3.5 py-1.5 bg-primary text-white text-[9px] font-bold uppercase rounded-lg hover:bg-accent transition-all cursor-pointer"
                              >
                                Unlock
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RAZORPAY UPI BILLING DRAWER OVERLAY */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!paymentProcessing) {
                  setShowUpgradeModal(false);
                  setPaymentError('');
                }
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-[#0f0e20] border border-white/10 rounded-[32px] w-full max-w-md p-6 shadow-2xl relative z-10 text-white"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-600/10 flex items-center justify-center">
                    <Sparkles size={15} className="text-violet-400 animate-pulse" />
                  </div>
                  <h3 className="font-extrabold text-base tracking-tight">Studio Pro Upgrade</h3>
                </div>
                {!paymentProcessing && (
                  <button 
                    onClick={() => {
                      setShowUpgradeModal(false);
                      setPaymentError('');
                    }}
                    className="p-2 text-white/40 hover:text-white rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {paymentSuccess ? (
                <div className="py-8 text-center flex flex-col items-center justify-center animate-scale-up select-none">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <Check size={32} strokeWidth={3} className="animate-pulse" />
                  </div>
                  <h4 className="font-black text-lg text-emerald-400">Upgrade Complete!</h4>
                  <p className="text-white/40 text-xs mt-1 leading-relaxed max-w-xs font-semibold">
                    Razorpay transaction authorized. Premium items and AI generator unlocked.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 text-xs font-semibold mt-4">
                  <div className="bg-violet-500/5 border border-violet-500/10 rounded-2xl p-4">
                    <h4 className="font-bold text-violet-400 uppercase text-[10px] tracking-wider mb-2">Pro benefits</h4>
                    <ul className="flex flex-col gap-1.5 text-white/70 list-disc list-inside">
                      <li>Full Avatar Studio customizer</li>
                      <li>AI Avatar generation from selfie</li>
                      <li>Elite Sports uniforms (Cricket, Basketball)</li>
                      <li>Premium wearable frames & accessories</li>
                    </ul>
                  </div>

                  {paymentError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-3 text-[11px] font-bold">
                      {paymentError}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/40 font-bold uppercase tracking-wider">UPI Address (UPI ID) *</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      placeholder="e.g. namrata@upi"
                      disabled={paymentProcessing}
                      className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-[#14132c] outline-none transition-all disabled:opacity-40"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-white/30 leading-relaxed bg-white/[0.01] border border-white/[0.02] p-3 rounded-2xl font-mono">
                    <Info size={14} className="shrink-0 text-white/20" />
                    Secure sandbox checkout by Razorpay UPI. Standard billing rate: ₹299/mo.
                  </div>

                  <button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={paymentProcessing || !upiId}
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-violet-600/10 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {paymentProcessing ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Verifying OTP...
                      </>
                    ) : (
                      <>
                        Upgrade & Authorize ₹299
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
