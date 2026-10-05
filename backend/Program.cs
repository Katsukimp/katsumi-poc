// API .NET local — roda na MESMA máquina do terminal.
// No projeto real, é aqui que vive o domínio: venda, estoque, fiscal,
// balança serial, impressora ESC/POS, TEF via P/Invoke.
using System.Collections.Concurrent;

var builder = WebApplication.CreateBuilder(args);

// CORS liberado só para o dev server do Vite (em produção o React é
// carregado via file:// e não precisa disso).
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins("http://localhost:5173")
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

// ---------------------------------------------------------------------------
// Catálogo em memória (no projeto real: SQLite local + sync com o servidor).
// Dinheiro SEMPRE decimal — nunca double/float (ver Requisitos Não Funcionais).
// ---------------------------------------------------------------------------
var catalogo = new ConcurrentDictionary<string, Produto>(StringComparer.OrdinalIgnoreCase);

foreach (var p in new[]
{
    new Produto("7891000315507", "Leite Integral Ninho 1L", 7.49m, "UN", false),
    new Produto("7894900011517", "Coca-Cola 2L", 9.99m, "UN", false),
    new Produto("7891910000197", "Açúcar União 1kg", 5.29m, "UN", false),
    new Produto("7896036098257", "Café Pilão 500g", 18.90m, "UN", false),
    new Produto("7891150064935", "Detergente Ypê 500ml", 2.89m, "UN", false),
    new Produto("2000001", "Banana Prata (kg)", 6.99m, "KG", true),
    new Produto("2000002", "Queijo Mussarela (kg)", 44.90m, "KG", true),
    new Produto("2000003", "Pão Francês (kg)", 15.90m, "KG", true)
})
{
    catalogo[p.Codigo] = p;
}

app.MapGet("/api/hello", () => new
{
    mensagem = "Hello World do backend .NET!",
    runtime = $".NET {Environment.Version}",
    maquina = Environment.MachineName,
    horario = DateTime.Now.ToString("HH:mm:ss")
});

app.MapGet("/api/produtos", () => catalogo.Values.OrderBy(p => p.Nome));

// Consulta por código de barras / código interno — o coração da bipagem.
app.MapGet("/api/produtos/{codigo}", (string codigo) =>
    catalogo.TryGetValue(codigo.Trim(), out var produto)
        ? Results.Ok(produto)
        : Results.NotFound(new { erro = "Produto não cadastrado", codigo }));

// Cadastro rápido: produto desconhecido nasce direto do caixa, sem parar a fila.
app.MapPost("/api/produtos", (Produto novo) =>
{
    if (string.IsNullOrWhiteSpace(novo.Codigo) || string.IsNullOrWhiteSpace(novo.Nome))
        return Results.BadRequest(new { erro = "Código e nome são obrigatórios" });

    if (novo.Preco <= 0)
        return Results.BadRequest(new { erro = "Preço de venda deve ser maior que zero" });

    if (!catalogo.TryAdd(novo.Codigo.Trim(), novo with { Codigo = novo.Codigo.Trim() }))
        return Results.Conflict(new { erro = "Já existe produto com este código" });

    return Results.Created($"/api/produtos/{novo.Codigo}", catalogo[novo.Codigo.Trim()]);
});

// Bind só em loopback: nenhuma outra máquina da rede alcança esta API.
app.Run("http://127.0.0.1:5100");

/// <summary>Produto do catálogo. Pesável usa quantidade fracionada (3 casas, kg).</summary>
record Produto(string Codigo, string Nome, decimal Preco, string Unidade, bool Pesavel);
