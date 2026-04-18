'use client'

import { useI18n } from '@/i18n'
import SectionWrapper from '@/components/ui/section-wrapper'
import { CheckIcon, XIcon } from '@/components/icons'
import type { TranslationKey } from '@/i18n/locales/zh'

type CellValue = 'yes' | 'no' | TranslationKey

interface ComparisonRow {
  featureKey: TranslationKey
  aiNote: CellValue
  obsidian: CellValue
  notion: CellValue
  yuque: CellValue
}

const rows: ComparisonRow[] = [
  { featureKey: 'comparison.localFirst', aiNote: 'yes', obsidian: 'yes', notion: 'no', yuque: 'no' },
  { featureKey: 'comparison.builtInGit', aiNote: 'yes', obsidian: 'no', notion: 'no', yuque: 'no' },
  { featureKey: 'comparison.zeroCloud', aiNote: 'yes', obsidian: 'comparison.exceptSync', notion: 'no', yuque: 'no' },
  { featureKey: 'comparison.standardMd', aiNote: 'yes', obsidian: 'yes', notion: 'comparison.proprietary', yuque: 'comparison.proprietary' },
  { featureKey: 'comparison.dualEdit', aiNote: 'yes', obsidian: 'comparison.sourceOnly', notion: 'comparison.wysiwygOnly', yuque: 'comparison.limited' },
  { featureKey: 'comparison.versionDiff', aiNote: 'yes', obsidian: 'no', notion: 'no', yuque: 'comparison.basic' },
  { featureKey: 'comparison.free', aiNote: 'yes', obsidian: 'comparison.limited', notion: 'comparison.limited', yuque: 'comparison.limited' },
]

function Cell({ value }: { value: CellValue }) {
  const { t } = useI18n()

  if (value === 'yes') {
    return (
      <span className="inline-flex items-center text-emerald-500">
        <CheckIcon />
      </span>
    )
  }
  if (value === 'no') {
    return (
      <span className="inline-flex items-center text-[var(--color-text-muted)]">
        <XIcon />
      </span>
    )
  }
  return <span className="text-xs text-[var(--color-text-muted)]">{t(value)}</span>
}

export default function ComparisonSection() {
  const { t } = useI18n()

  const products = ['AI-Note', 'Obsidian', 'Notion', '语雀']

  return (
    <SectionWrapper id="comparison" alternate>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
          {t('comparison.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--color-text-secondary)]">
          {t('comparison.subtitle')}
        </p>
      </div>

      <div className="mt-14 overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="pb-4 pr-4 text-left font-medium text-[var(--color-text-muted)]">
                {t('comparison.feature')}
              </th>
              {products.map((name, i) => (
                <th
                  key={name}
                  className={`pb-4 text-center font-semibold ${
                    i === 0
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.featureKey} className="border-b border-[var(--color-border)]">
                <td className="py-4 pr-4 font-medium text-[var(--color-text-primary)]">
                  {t(row.featureKey)}
                </td>
                <td className="py-4 text-center">
                  <Cell value={row.aiNote} />
                </td>
                <td className="py-4 text-center">
                  <Cell value={row.obsidian} />
                </td>
                <td className="py-4 text-center">
                  <Cell value={row.notion} />
                </td>
                <td className="py-4 text-center">
                  <Cell value={row.yuque} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionWrapper>
  )
}
