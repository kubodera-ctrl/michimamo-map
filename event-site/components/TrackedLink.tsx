'use client';

import type { MouseEventHandler, ReactNode } from 'react';
import { recordMetric } from './MetricPing';

type Props={
  href:string;
  metric:string;
  eventSlug?:string;
  className?:string;
  target?:string;
  rel?:string;
  children:ReactNode;
};

export function TrackedLink({href,metric,eventSlug,className,target,rel,children}:Props) {
  const onClick:MouseEventHandler<HTMLAnchorElement>=() => {
    void recordMetric(metric,eventSlug);
  };
  return <a href={href} className={className} target={target} rel={rel} onClick={onClick}>{children}</a>;
}
