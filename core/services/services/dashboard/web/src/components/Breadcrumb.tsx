import React from 'react';
import { Link } from 'react-router-dom';
import { IconChevronRight } from '@tabler/icons-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 mb-6 text-xs select-none">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <IconChevronRight size={12} className="text-slate-600 shrink-0" />
          )}
          {item.to ? (
            <Link
              to={item.to}
              className="text-slate-500 hover:text-slate-200 transition-colors duration-150 font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-300 font-bold">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default Breadcrumb;
