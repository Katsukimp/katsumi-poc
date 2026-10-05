# hello-desktop — spike da arquitetura MM ERP

Prova de conceito da stack definida em `Stack.md`: **React + Vite renderizando dentro de um WebView2, numa janela WPF, chamando uma API .NET que roda na mesma máquina.**

## As três peças

```
frontend/   React + Vite      → TODAS as telas (o front escreve só aqui)
shell/      WPF + WebView2    → a moldura: 1 janela, ~50 linhas, nunca cresce
backend/    ASP.NET Core      → o cérebro: dominio, hardware, fiscal
```

Fluxo do botão: React (`App.tsx`) → `fetch http://127.0.0.1:5100/api/hello` → API .NET responde JSON → React renderiza.

## Como rodar

```cmd
dev.cmd
```

Ou manualmente, em três terminais:

```cmd
cd backend  && dotnet run      REM API em 127.0.0.1:5100
cd frontend && npm run dev     REM Vite em localhost:5173
cd shell    && dotnet run      REM abre a janela
```

A casca detecta o ambiente sozinha: se existir `frontend/index.html` publicado ao lado do executável, carrega dele (`file://`, produção); senão aponta para o dev server do Vite (hot reload).

## O que este spike demonstra

- É um **app desktop instalado**, não um site: opera sem internet, tudo em loopback
- O front trabalha com `npm run dev` + hot reload + DevTools (F12), como em qualquer projeto web
- A casca não tem regra de negócio — trocá-la por Tauri não mexeria em `frontend/`
- A API fica em `127.0.0.1` (loopback): nenhuma outra máquina da rede a alcança

## Requisitos mínimos de máquina (critério de aceite, não workaround de código)

Em vez de blindar a aplicação contra qualquer hardware, a instalação é condicionada a um mínimo. Fora disso, não se homologa a máquina — não se tenta fazer rodar mesmo assim.

- **SO**: Windows 11, ou Windows 10 Enterprise/IoT/LTSC (Windows 10 Home/Pro comum está fora de suporte da própria Microsoft desde out/2025 e nenhuma versão atual do .NET dá suporte oficial a essa combinação — não é algo que trocar de versão do .NET resolve)
- **RAM**: 4GB mínimo, 8GB recomendado
- **Armazenamento**: SSD obrigatório (boot em HDD mecânico não é suportado)
- **WebView2 Runtime**: precisa estar instalado (Evergreen) — verificar/instalar no setup, não assumir presente
- **GPU**: sem placa dedicada exigida, mas driver atualizado — hardware com driver problemático pode cair em software rendering e apresentar tela em branco na WebView2

## O que ele NÃO valida (spikes seguintes)

- Performance na pior máquina do mercado (grid de venda com bipagem simulada)
- P/Invoke da DLL de TEF e leitura da balança serial
- Empacotamento final (instalador MSI + auto-update)
