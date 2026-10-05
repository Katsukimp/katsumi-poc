// Client da API .NET local. No projeto real, este arquivo seria GERADO
// a partir do OpenAPI — mudança de contrato viraria erro de compilação.
const API = 'http://127.0.0.1:5100'

export type Hello = {
  mensagem: string
  runtime: string
  maquina: string
  horario: string
}

export type Produto = {
  codigo: string
  nome: string
  preco: number
  unidade: string
  pesavel: boolean
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function json<T>(resposta: Response): Promise<T> {
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null)
    throw new ApiError(corpo?.erro ?? `HTTP ${resposta.status}`, resposta.status)
  }
  return resposta.json() as Promise<T>
}

export const api = {
  hello: () => fetch(`${API}/api/hello`).then(json<Hello>),

  produtos: () => fetch(`${API}/api/produtos`).then(json<Produto[]>),

  buscarProduto: (codigo: string) =>
    fetch(`${API}/api/produtos/${encodeURIComponent(codigo)}`).then(json<Produto>),

  cadastrarProduto: (produto: Produto) =>
    fetch(`${API}/api/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produto)
    }).then(json<Produto>)
}

export const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

export const qtd = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3
})
