import React from 'react';
import { HomepageBlock } from '../../store';
import { HeroSliderBlock } from './blocks/HeroSliderBlock';
import { MatchesBlock } from './blocks/MatchesBlock';
import { BlogsBlock } from './blocks/BlogsBlock';
import { FeaturesGridBlock } from './blocks/FeaturesGridBlock';
import { CompetitionsBlock } from './blocks/CompetitionsBlock';
import { ClubsBlock } from './blocks/ClubsBlock';
import { AdsBlock } from './blocks/AdsBlock';
import { SpacerBlock } from './blocks/SpacerBlock';
import { CustomTextBlock } from './blocks/CustomTextBlock';

export function HomepageRenderer({ blocks }: { blocks: HomepageBlock[] }) {
  const enabledBlocks = (blocks || []).filter(b => b && b.enabled);

  return (
    <div className="pb-20">
      {enabledBlocks.map(block => {
        if (block.type === 'hero_slider') {
          return <HeroSliderBlock key={block.id} block={block} />;
        }

        return (
          <div key={block.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
            <HomepageBlockRenderer block={block} />
          </div>
        );
      })}
    </div>
  );
}

function HomepageBlockRenderer({ block }: { block: HomepageBlock }) {
  switch (block.type) {
    case 'hero_slider':
      return <HeroSliderBlock block={block} />;
    case 'featured_broadcasts':
    case 'live_matches':
    case 'upcoming_matches':
    case 'completed_matches':
      return <MatchesBlock block={block} />;
    case 'latest_blogs':
      return <BlogsBlock block={block} />;
    case 'features_grid':
      return <FeaturesGridBlock block={block} />;
    case 'competitions':
      return <CompetitionsBlock block={block} />;
    case 'clubs':
      return <ClubsBlock block={block} />;
    case 'ads':
      return <AdsBlock block={block} />;
    case 'spacer':
      return <SpacerBlock block={block} />;
    case 'custom_text':
      return <CustomTextBlock block={block} />;
    default:
      return null;
  }
}
