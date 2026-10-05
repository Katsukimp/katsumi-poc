import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, ApiError, brl, qtd, type Produto } from '../api'
import './pdv.css'

type Item = {
  id: number
  codigo: string
  nome: string
  unidade: string
  preco: number
  quantidade: number
}

type Cadastro = { codigo: string; nome: string; preco: string; unidade: string; pesavel: boolean }

const CADASTRO_VAZIO: Cadastro = { codigo: '', nome: '', preco: '', unidade: 'UN', pesavel: false }

export default function Pdv({ onVoltar }: { onVoltar: () => void }) {
  const [itens, setItens] = useState<Item[]>([])
  const [codigo, setCodigo] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null)
  const [catalogo, setCatalogo] = useState<Produto[]>([])
  const [cadastro, setCadastro] = useState<Cadastro | null>(null)
  const [relogio, setRelogio] = useState(() => new Date())

  const inputCodigo = useRef<HTMLInputElement>(null)
  const inputQtd = useRef<HTMLInputElement>(null)
  const inputCadastroNome = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  const total = useMemo(
    () => itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0),
    [itens]
  )
  const ultimo = itens.at(-1) ?? null

  useEffect(() => {
    api.produtos().then(setCatalogo).catch(() => setCatalogo([]))
    const t = setInterval(() => setRelogio(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (cadastro) inputCadastroNome.current?.focus()
    else inputCodigo.current?.focus()
  }, [cadastro])

  const adicionar = useCallback(async () => {
    const cod = codigo.trim()
    if (!cod) return
    const qtdNum = Number(quantidade.replace(',', '.'))
    if (!qtdNum || qtdNum <= 0) {
      setAviso({ tipo: 'erro', texto: 'Quantidade inválida' })
      return
    }

    try {
      // A validação de verdade (preço, promoção, estoque) mora no .NET.
      const p = await api.buscarProduto(cod)
      setItens((atual) => [
        ...atual,
        { id: ++seq.current, codigo: p.codigo, nome: p.nome, unidade: p.unidade, preco: p.preco, quantidade: qtdNum }
      ])
      setCodigo('')
      setQuantidade('1')
      setAviso(null)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        // Produto desconhecido: abre cadastro rápido sem parar a fila.
        setCadastro({ ...CADASTRO_VAZIO, codigo: cod })
        setAviso({ tipo: 'erro', texto: `Código ${cod} não cadastrado — cadastro rápido aberto` })
      } else {
        setAviso({ tipo: 'erro', texto: (e as Error).message })
      }
    }
  }, [codigo, quantidade])

  const removerUltimo = useCallback(() => {
    setItens((atual) => atual.slice(0, -1))
  }, [])

  const salvarCadastro = useCallback(async () => {
    if (!cadastro) return
    try {
      const criado = await api.cadastrarProduto({
        codigo: cadastro.codigo.trim(),
        nome: cadastro.nome.trim(),
        preco: Number(cadastro.preco.replace(',', '.')),
        unidade: cadastro.unidade,
        pesavel: cadastro.pesavel
      })
      setCatalogo((c) => [...c, criado].sort((a, b) => a.nome.localeCompare(b.nome)))
      setCadastro(null)
      setCodigo(criado.codigo)
      setAviso({ tipo: 'ok', texto: `${criado.nome} cadastrado — bipe novamente para vender` })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message })
    }
  }, [cadastro])

  // Teclado-first: o operador experiente não usa mouse.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F2') { e.preventDefault(); inputQtd.current?.select() }
      if (e.key === 'F4') { e.preventDefault(); setCadastro({ ...CADASTRO_VAZIO, codigo: codigo.trim() }) }
      if (e.key === 'F9') { e.preventDefault(); if (itens.length) { setAviso({ tipo: 'ok', texto: `Venda finalizada: ${brl.format(total)} (simulação)` }); setItens([]) } }
      if (e.key === 'Delete') { e.preventDefault(); removerUltimo() }
      if (e.key === 'Escape') {
        e.preventDefault()
        if (cadastro) setCadastro(null)
        else { setCodigo(''); setQuantidade('1'); setAviso(null) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cadastro, codigo, itens.length, total, removerUltimo])

  return (
    <div className="pdv">
      <header className="pdv-top">
        <div className="pdv-ident">
          <strong>VENDA</strong>
          <span>Caixa 01 · Terminal EDUARDO</span>
        </div>
        <div className="pdv-op">
          <span>Operador: <b>MARIA</b></span>
          <span className="pdv-caixa-aberto">CAIXA ABERTO</span>
          <span className="pdv-hora">{relogio.toLocaleTimeString('pt-BR')}</span>
          <button className="pdv-voltar" onClick={onVoltar} title="Voltar ao onboarding">
            ← spike
          </button>
        </div>
      </header>

      <div className="pdv-corpo">
        <section className="pdv-venda">
          <div className="pdv-entrada">
            <label>
              Código / EAN
              <input
                ref={inputCodigo}
                value={codigo}
                autoFocus
                inputMode="numeric"
                placeholder="bipe ou digite e pressione Enter"
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adicionar()}
              />
            </label>
            <label className="pdv-qtd">
              Qtd (F2)
              <input
                ref={inputQtd}
                value={quantidade}
                inputMode="decimal"
                onChange={(e) => setQuantidade(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (inputCodigo.current?.focus(), inputCodigo.current?.select())}
              />
            </label>
            <button className="pdv-add" onClick={adicionar}>Adicionar</button>
          </div>

          <div className="pdv-grid-wrap">
            <table className="pdv-grid">
              <thead>
                <tr>
                  <th className="c-item">#</th>
                  <th className="c-cod">Código</th>
                  <th>Descrição</th>
                  <th className="c-un">Un</th>
                  <th className="c-num">Qtd</th>
                  <th className="c-num">Unitário</th>
                  <th className="c-num">Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i, idx) => (
                  <tr key={i.id} className={idx === itens.length - 1 ? 'atual' : undefined}>
                    <td className="c-item">{String(idx + 1).padStart(3, '0')}</td>
                    <td className="c-cod">{i.codigo}</td>
                    <td>{i.nome}</td>
                    <td className="c-un">{i.unidade}</td>
                    <td className="c-num">{qtd.format(i.quantidade)}</td>
                    <td className="c-num">{brl.format(i.preco)}</td>
                    <td className="c-num forte">{brl.format(i.preco * i.quantidade)}</td>
                  </tr>
                ))}
                {itens.length === 0 && (
                  <tr className="pdv-sem-itens">
                    <td colSpan={7}>Nenhum item — bipe um produto para iniciar a venda</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={`pdv-aviso ${aviso?.tipo ?? ''}`}>
            {aviso?.texto ?? `${itens.length} ${itens.length === 1 ? 'item' : 'itens'} na venda`}
          </div>
        </section>

        <aside className="pdv-lateral">
          <div className="pdv-ultimo">
            <span className="rot">Último item</span>
            {ultimo ? (
              <>
                <strong className="nome">{ultimo.nome}</strong>
                <span className="calc">
                  {qtd.format(ultimo.quantidade)} {ultimo.unidade} × {brl.format(ultimo.preco)}
                </span>
                <span className="sub">{brl.format(ultimo.preco * ultimo.quantidade)}</span>
              </>
            ) : (
              <strong className="nome vazio">—</strong>
            )}
          </div>

          <div className="pdv-total">
            <span className="rot">Total a pagar</span>
            <strong>{brl.format(total)}</strong>
          </div>

          <div className="pdv-atalhos">
            <span className="rot">Atalhos</span>
            <ul>
              <li><kbd>Enter</kbd> adicionar item</li>
              <li><kbd>F2</kbd> quantidade / peso</li>
              <li><kbd>F4</kbd> cadastro rápido</li>
              <li><kbd>F9</kbd> finalizar venda</li>
              <li><kbd>Del</kbd> remover último</li>
              <li><kbd>Esc</kbd> limpar / fechar</li>
            </ul>
          </div>

          <div className="pdv-catalogo">
            <span className="rot">Códigos para testar ({catalogo.length})</span>
            <ul>
              {catalogo.map((p) => (
                <li key={p.codigo}>
                  <button onClick={() => { setCodigo(p.codigo); inputCodigo.current?.focus() }}>
                    <code>{p.codigo}</code>
                    <span>{p.nome}</span>
                    <b>{brl.format(p.preco)}</b>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {cadastro && (
        <div className="pdv-modal-fundo" onClick={() => setCadastro(null)}>
          <div className="pdv-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Cadastro rápido de produto</h2>
            <p className="pdv-modal-sub">
              Produto desconhecido nasce aqui, sem parar a fila. No sistema real,
              os dados fiscais (NCM, CST) são herdados do grupo fiscal.
            </p>

            <div className="pdv-form">
              <label>
                Código / EAN
                <input
                  value={cadastro.codigo}
                  onChange={(e) => setCadastro({ ...cadastro, codigo: e.target.value })}
                />
              </label>
              <label className="largo">
                Descrição
                <input
                  ref={inputCadastroNome}
                  value={cadastro.nome}
                  placeholder="ex: Biscoito Recheado 140g"
                  onChange={(e) => setCadastro({ ...cadastro, nome: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && salvarCadastro()}
                />
              </label>
              <label>
                Preço de venda
                <input
                  value={cadastro.preco}
                  inputMode="decimal"
                  placeholder="0,00"
                  onChange={(e) => setCadastro({ ...cadastro, preco: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && salvarCadastro()}
                />
              </label>
              <label>
                Unidade
                <select
                  value={cadastro.unidade}
                  onChange={(e) => setCadastro({
                    ...cadastro,
                    unidade: e.target.value,
                    pesavel: e.target.value === 'KG'
                  })}
                >
                  <option value="UN">UN — unidade</option>
                  <option value="KG">KG — pesável</option>
                  <option value="L">L — litro</option>
                  <option value="PCT">PCT — pacote</option>
                </select>
              </label>
            </div>

            <div className="pdv-modal-acoes">
              <button className="btn-fantasma" onClick={() => setCadastro(null)}>Cancelar (Esc)</button>
              <button className="pdv-add" onClick={salvarCadastro}>Salvar e voltar à venda</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
