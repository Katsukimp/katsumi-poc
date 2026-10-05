using System.Diagnostics;
using System.IO;
using System.Windows;

namespace Hello.Shell;

/// <summary>
/// A "casca": cria a janela, sobe a API .NET local e aponta o WebView2 para o React.
/// Nunca cresce — não tem regra de negócio nem tela aqui.
/// </summary>
public partial class MainWindow : Window
{
    private Process? _api;

    public MainWindow()
    {
        InitializeComponent();
        SubirApiLocal();
        Loaded += async (_, _) =>
        {
            await webView.EnsureCoreWebView2Async();

            // Casca "desarma" os atalhos de navegador (F5, Ctrl+P, Ctrl+F, zoom...)
            // antes da primeira navegação — quem decide o que essas teclas fazem
            // a partir daqui é o React (ver Pdv.tsx, tecla F9 por exemplo).
            var settings = webView.CoreWebView2.Settings;
            settings.AreBrowserAcceleratorKeysEnabled = false;
            settings.AreDefaultContextMenusEnabled = false;
            settings.IsStatusBarEnabled = false;
#if DEBUG
            settings.AreDevToolsEnabled = true;
#else
            settings.AreDevToolsEnabled = false;
#endif

            webView.Source = ResolverUiOrigem();
        };
        Closed += (_, _) => { if (_api is { HasExited: false }) _api.Kill(true); };
    }

    /// <summary>
    /// DEV: aponta para o dev server do Vite (hot reload — salvou o .tsx, a janela atualiza).
    /// PROD: aponta para o build do Vite empacotado junto do executável.
    /// </summary>
    private static Uri ResolverUiOrigem()
    {
        var dist = Path.Combine(AppContext.BaseDirectory, "frontend", "index.html");
        return File.Exists(dist)
            ? new Uri($"file:///{dist.Replace('\\', '/')}")
            : new Uri("http://localhost:5173");
    }

    /// <summary>
    /// Sobe a API .NET local como processo filho e a supervisiona — no projeto real,
    /// aqui entra reinício automático se ela morrer.
    /// </summary>
    private void SubirApiLocal()
    {
        var exe = Path.Combine(AppContext.BaseDirectory, "Hello.Api.exe");
        var info = File.Exists(exe)
            ? new ProcessStartInfo(exe)
            : new ProcessStartInfo("dotnet", "run --project ../../../../backend/Hello.Api.csproj")
              { WorkingDirectory = AppContext.BaseDirectory };

        info.CreateNoWindow = true;
        info.UseShellExecute = false;
        _api = Process.Start(info);
    }
}
