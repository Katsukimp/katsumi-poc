import { useCallback, useEffect, useState } from 'react'
import { api, type Hello } from '../api'
import './onboarding.css'

type Status = 'verificando' | 'online' | 'offline'

export default function Onboarding({ onAbrirPdv }: { onAbrirPdv: () => void }) {
  const [status, setStatus] = useState<Status>('verificando')
  const [resposta, setResposta] = useState<Hello | null>(null)
  const [latencia, setLatencia] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const chamarApi = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true)
    setErro(null)
    try {
      const inicio = performance.now()
      const dados = await api.hello()
      setLatencia(performance.now() - inicio)
      setResposta(dados)
      setStatus('online')
    } catch (e) {
      setStatus('offline')
      if (!silencioso) setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [])

  // health-check ao abrir: o app precisa saber se a API local subiu
  useEffect(() => {
    chamarApi(true)
  }, [chamarApi])

  return (
    <div className="onb">
      <header className="onb-top">
        <div className="onb-brand">
          <span className="onb-logo" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
          <div>
            <strong>MM ERP</strong>
            <small>Spike de arquitetura</small>
          </div>
        </div>

        <div className={`onb-status ${status}`}>
          <span className="dot" />
          {status === 'online' ? 'API local conectada' : status === 'offline' ? 'API local indisponível' : 'verificando...'}
        </div>
      </header>

      <main className="onb-content">
        <section>
          <span className="onb-badge">app desktop · offline-first</span>
          <h1>
            React renderizando dentro do <span className="hl">WebView2</span>,
            numa janela WPF.
          </h1>
          <p>
            Esta tela é HTML/CSS/JS empacotado no executável. Os botões abaixo
            chamam a API .NET que roda <strong>nesta mesma máquina</strong>, em
            loopback — sem internet, sem servidor remoto.
          </p>

          <div className="onb-acoes">
            <button className="btn-primaria" onClick={() => chamarApi()} disabled={carregando}>
              {carregando ? 'Chamando API...' : 'Disparar Hello World'}
            </button>
            <button className="btn-secundaria" onClick={onAbrirPdv}>
              Abrir cadastro / operacional →
            </button>
            {latencia !== null && (
              <span className="onb-latencia" title="Ida e volta até a API local">
                {latencia < 1 ? '< 1' : latencia.toFixed(1)} ms
              </span>
            )}
          </div>

          {erro && (
            <div className="onb-alerta">
              Não foi possível falar com a API local ({erro}). Ela sobe junto com a
              casca — confira o processo <code>Hello.Api</code>.
            </div>
          )}
        </section>

        <section className="onb-painel">
          <div className="onb-painel-head">
            <h2>Resposta do backend</h2>
            {resposta && <span className="onb-tag">200 OK</span>}
          </div>

          {resposta ? (
            <>
              <p className="onb-mensagem">{resposta.mensagem}</p>
              <dl>
                <div><dt>Runtime</dt><dd>{resposta.runtime}</dd></div>
                <div><dt>Máquina</dt><dd>{resposta.maquina}</dd></div>
                <div><dt>Horário do servidor local</dt><dd>{resposta.horario}</dd></div>
              </dl>
            </>
          ) : (
            <p className="onb-vazio">Nenhuma chamada ainda. Clique no botão para falar com o .NET.</p>
          )}
        </section>
      </main>

      <footer className="onb-rodape">
        <div><span className="peca">frontend/</span> React + Vite<em>todas as telas</em></div>
        <div><span className="peca">shell/</span> WPF + WebView2<em>só a moldura</em></div>
        <div><span className="peca">backend/</span> .NET 10 local<em>domínio, fiscal, hardware</em></div>
      </footer>
    </div>
  )
}
