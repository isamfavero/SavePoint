import { useState } from 'react'

type Tab = {
  id: string
  label: string
}

type TabsProps = {
  tabs: Tab[]
  valorInicial?: string
  aoMudar?: (id: string) => void
  className?: string
}

export function Tabs({
  tabs,
  valorInicial,
  aoMudar,
  className,
}: TabsProps) {
  const [ativo, setAtivo] = useState(valorInicial ?? tabs[0]?.id ?? '')

  function selecionar(id: string) {
    setAtivo(id)
    aoMudar?.(id)
  }

  return (
    <div className={['tabs', className].filter(Boolean).join(' ')}>
      <div className="tabs-controle" role="tablist" aria-label="Abas da Jornada">
        {tabs.map(({ id, label }) => {
          const selecionado = ativo === id

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selecionado}
              className={[
                'tab-item',
                selecionado ? 'tab-item-ativo' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => selecionar(id)}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function useTab(valorInicial: string) {
  const [ativo, setAtivo] = useState(valorInicial)

  return { ativo, setAtivo }
}
