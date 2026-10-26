# Rocket Arena — listo para GitHub Pages

Esta carpeta contiene únicamente los archivos de publicación y el servidor LAN. No incluye sonidos nuevos, descargas originales, capturas de pantalla, pruebas, compiladores ni dependencias instaladas.

## Publicar en GitHub Pages

1. Sube TODO EL CONTENIDO de esta carpeta a la raíz de tu repositorio, en la rama main. index.html debe quedar directamente en la raíz, no dentro de PARA-GITHUB ni de dist.
2. En GitHub entra a Settings → Pages.
3. En Source selecciona Deploy from a branch.
4. Selecciona main y /(root), y guarda con Save.
5. Espera a que GitHub termine la publicación y abre la dirección que aparezca en Pages.

No necesitas ejecutar una compilación ni configurar GitHub Actions. Incluye también .nojekyll y .gitignore, aunque tu explorador o el selector de archivos los oculte. Si subes mediante la web, extrae primero el ZIP: subir el ZIP sin extraer no publica el juego.

Referencia: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Qué se puede jugar desde Pages

Entrenamiento libre, garaje y partidos casuales o competitivos con bots en 1v1, 2v2 y 3v3. Es un jugador humano contra el juego; no hace falta ejecutar un servidor propio para estos modos.

Los archivos y la física se ejecutan en el navegador. Hace falta conexión para abrir/descargar inicialmente la página; no se incluye instalación PWA ni garantía de funcionamiento después de desconectar Internet. Usa un navegador de escritorio con WebGL y WebAssembly.

## Jugar entre computadoras del mismo Wi-Fi (LAN)

GitHub Pages aloja archivos estáticos y no ejecuta el servidor multijugador. Una computadora anfitriona debe tener esta carpeta descargada y Node.js 22 o posterior.

En la computadora anfitriona, desde esta carpeta:

```sh
npm ci
npm start
```

También puedes ejecutar Start-Game.ps1 en Windows, que instala la dependencia si falta e inicia el servidor en segundo plano. npm ci necesita Internet la primera vez; después el juego LAN usa la red local.

El servidor muestra una dirección LAN, por ejemplo http://192.168.0.10:8080. TODOS abren esa misma dirección en el navegador. Los invitados no necesitan instalar Node ni descargar esta carpeta.

El anfitrión crea una sala pública en Jugar → Partida privada → LAN y pone una contraseña. Los invitados buscan la sala y solicitan entrar. El anfitrión asigna sus equipos; reemplazan a bots. El anfitrión inicia el partido; los invitados pulsan Entrar al partido.

Abre directamente la dirección HTTP de la computadora anfitriona para LAN. No intentes conectar desde la página HTTPS de GitHub a un servidor HTTP local: el navegador puede bloquearlo.

Mantén la computadora anfitriona encendida. Si no conecta, comprueba el firewall de redes privadas y que el Wi-Fi no aísle dispositivos. Puertos: TCP 8080 y UDP 9182. La IP puede cambiar. Para detener el servidor usa Ctrl+C si arrancó con npm start; si usaste el lanzador oculto, finaliza su proceso Node.

## Contenido y créditos

Incluye estadio de día/atardecer/noche, espectadores 2D, luces graduales, cinco eventos aéreos por partido, turbo y estelas, explosiones, salvadas, bots y repeticiones. A los tres minutos transcurridos llega el atardecer; con 1:00 restante ya es de noche. No se añadieron sonidos.

Conserva ASSET-CREDITS.md, las licencias dentro de assets y THIRD-PARTY-LICENSES. Los modelos de Octane, Fennec y Dominus son comunitarios de Jako; el F1 Concept es de Qvist_designs y no es el F1 oficial de Rocket League. Es un prototipo independiente inspirado en el juego, sin afiliación oficial.

La conexión ONLINE queda preparada para un servidor HTTPS/WSS externo, pero no se incluye un servidor publicado en Internet. Las salas son temporales y se cierran si sale el anfitrión.
