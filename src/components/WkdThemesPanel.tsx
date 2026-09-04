import type { WkdThemeResult } from '../api/wkd'
import { formatWegbreedte, wkdPropertyEntries } from '../lib/fieldLabels'
import { WKD_PANEL_INFO, WKD_THEME_INFO } from '../lib/infoTexts'
import { InfoButton } from './InfoButton'

const MAX_FEATURES_PER_THEME = 15

interface WkdThemesPanelProps {
  themes: WkdThemeResult[]
}

export function WkdThemesPanel({ themes }: WkdThemesPanelProps) {
  if (themes.length === 0) return null

  // Themes arrive incrementally as each of the 26 requests settles — sort by
  // layer id so cards slot into a stable position instead of jumping around.
  const sorted = [...themes].sort((a, b) => a.layer.id - b.layer.id)

  return (
    <section className="wkd-panel">
      <h2>
        Wegkenmerken (WKD)
        <InfoButton label="Wegkenmerkendatabase (WKD)" text={WKD_PANEL_INFO} />
      </h2>
      <p className="subtitle">
        Kenmerken uit de Wegkenmerkendatabase van Rijkswaterstaat, gekoppeld op wegvak-id.
      </p>
      <div className="wkd-theme-grid">
        {sorted.map(({ layer, features }) => (
          <article key={layer.id} className="wkd-theme-card">
            <h3>
              {layer.label} <span className="muted">({features.length})</span>
              {WKD_THEME_INFO[layer.key] && <InfoButton label={layer.label} text={WKD_THEME_INFO[layer.key]} />}
            </h3>
            <ul className="wkd-feature-list">
              {features.slice(0, MAX_FEATURES_PER_THEME).map((f, i) => (
                <li key={f.id ?? i}>
                  {layer.key === 'wegbreedte' ? (
                    formatWegbreedte(f.properties)
                  ) : (
                    <dl className="wkd-entry">
                      {wkdPropertyEntries(f.properties).map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
            {features.length > MAX_FEATURES_PER_THEME && (
              <p className="muted">+{features.length - MAX_FEATURES_PER_THEME} meer</p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
