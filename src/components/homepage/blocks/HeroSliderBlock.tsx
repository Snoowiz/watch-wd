import React from 'react';
import { Slider } from '../../Slider';
import { HomepageBlock } from '../../../store';

export function HeroSliderBlock({ block }: { block: HomepageBlock }) {
  const sliderId = block.config?.sliderId || 'default-hero';
  return (
    <div className="w-full -mt-8 sm:-mt-10 mb-8 sm:mb-12">
      <Slider id={sliderId} />
    </div>
  );
}
