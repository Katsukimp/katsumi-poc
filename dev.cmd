@echo off
REM Sobe as tres pecas em modo desenvolvimento.
REM A casca WPF ja sobe a API sozinha, mas aqui elas ficam visiveis em janelas separadas.

echo [1/3] API .NET local (127.0.0.1:5100)...
start "MM ERP - API local" cmd /k "cd backend && dotnet run"

echo [2/3] Vite dev server (localhost:5173)...
start "MM ERP - Vite" cmd /k "cd frontend && npm run dev"

echo Aguardando o Vite subir...
timeout /t 6 /nobreak >nul

echo [3/3] Casca WPF + WebView2...
cd shell && dotnet run

echo.
echo Feche as janelas da API e do Vite para encerrar tudo.
