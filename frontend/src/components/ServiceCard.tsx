import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

export interface ServiceCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  features?: string[];
  href?: string;
  colorTheme?: 'blue' | 'green';
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  id,
  title,
  description,
  icon,
  badge,
  features = [],
  href = '/services',
  colorTheme = 'blue',
}) => {
  const isBlue = colorTheme === 'blue';

  return (
    <div
      id={id}
      className="group relative flex flex-col justify-between p-6 sm:p-7 bg-card rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
    >
      <div>
        {/* Top Header Row with Icon and Badge */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
              isBlue ? 'bg-primary-light text-primary' : 'bg-secondary-light text-secondary'
            }`}
          >
            {icon}
          </div>
          {badge && (
            <span
              className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${
                isBlue
                  ? 'bg-blue-50 text-primary border-blue-100'
                  : 'bg-emerald-50 text-secondary border-emerald-100'
              }`}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-bold text-navy group-hover:text-primary transition-colors duration-200 mb-2.5">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          {description}
        </p>

        {/* Key Features List */}
        {features.length > 0 && (
          <ul className="space-y-2 mb-6 pt-2 border-t border-border/60">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-navy/80 font-medium">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    isBlue ? 'bg-primary-light text-primary' : 'bg-secondary-light text-secondary'
                  }`}
                >
                  <Check size={10} strokeWidth={3} />
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Action Footer Link */}
      <div className="pt-4 border-t border-border/40">
        <Link
          href={href}
          className={`inline-flex items-center gap-2 text-sm font-semibold transition-all duration-200 group-hover:gap-3 ${
            isBlue ? 'text-primary hover:text-primary-hover' : 'text-secondary hover:text-secondary-hover'
          }`}
          aria-label={`Explore ${title} details`}
        >
          <span>Explore Service</span>
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
};
