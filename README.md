# ⚽ Mundial 2026 Tracker

Webapp para seguir todos los partidos del Mundial FIFA 2026 en tiempo real.

## Funcionalidades
- 📅 Calendario y resultados (goles, tarjetas, estado del partido)
- ⚽ Tabla de goleadores
- 📊 Tabla de posiciones por grupo
- 🌍 Equipos y planteles completos
- 📈 Estadísticas del torneo

---

## Deploy en Vercel (paso a paso)

### 1. Obtené tu API key gratuita
- Andá a https://www.football-data.org/client/register
- Registrate (es gratis)
- Te mandan la API key por mail

### 2. Subí el código a GitHub
```bash
git init
git add .
git commit -m "Mundial 2026 tracker"
git branch -M main
# Creá un repo en github.com y copiá la URL
git remote add origin https://github.com/TU_USUARIO/mundial2026.git
git push -u origin main
```

### 3. Conectá con Vercel
- Andá a https://vercel.com y logueate con tu cuenta de GitHub
- Click en **Add New → Project**
- Seleccioná el repo `mundial2026`
- Antes de hacer deploy, en **Environment Variables** agregá:
  - **Name:** `FOOTBALL_API_KEY`
  - **Value:** tu API key de football-data.org
- Click en **Deploy**

¡Listo! En ~1 minuto tu app está en `https://mundial2026.vercel.app` (o similar).

### 4. Actualizaciones futuras
Cada vez que hagas `git push`, Vercel re-deploya automáticamente.

---

## Desarrollo local

Para correr localmente necesitás Vercel CLI:
```bash
npm install -g vercel
vercel dev
```

O con Python (sin la API, solo para ver el diseño):
```bash
python3 -m http.server 8000
```
