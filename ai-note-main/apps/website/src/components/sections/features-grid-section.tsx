'use client'

import { useI18n } from '@/i18n'
import SectionWrapper from '@/components/ui/section-wrapper'
import FeatureCard from '@/components/ui/feature-card'
import {
  ShieldIcon,
  GitBranchIcon,
  EditIcon,
  SearchIcon,
  FolderIcon,
  MonitorIcon,
} from '@/components/icons'

export default function FeaturesGridSection() {
  const { t } = useI18n()

  const features = [
    { icon: <ShieldIcon />, titleKey: 'features.localFirst.title' as const, descKey: 'features.localFirst.desc' as const },
    { icon: <GitBranchIcon />, titleKey: 'features.git.title' as const, descKey: 'features.git.desc' as const },
    { icon: <EditIcon />, titleKey: 'features.dualEdit.title' as const, descKey: 'features.dualEdit.desc' as const },
    { icon: <SearchIcon />, titleKey: 'features.search.title' as const, descKey: 'features.search.desc' as const },
    { icon: <FolderIcon />, titleKey: 'features.organize.title' as const, descKey: 'features.organize.desc' as const },
    { icon: <MonitorIcon />, titleKey: 'features.crossPlatform.title' as const, descKey: 'features.crossPlatform.desc' as const },
  ]

  return (
    <SectionWrapper id="features" alternate>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
          {t('features.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--color-text-secondary)]">
          {t('features.subtitle')}
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <FeatureCard
            key={f.titleKey}
            icon={f.icon}
            title={t(f.titleKey)}
            description={t(f.descKey)}
          />
        ))}
      </div>
    </SectionWrapper>
  )
}
