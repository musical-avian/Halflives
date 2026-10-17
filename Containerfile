# Local preview only; production is GitHub Pages. See docs/podman.md
FROM docker.io/nginxinc/nginx-unprivileged:1.27-alpine
COPY index.html app.js model.js pk.js presets.js io.js /usr/share/nginx/html/
COPY vendor/ /usr/share/nginx/html/vendor/
COPY docs/ /usr/share/nginx/html/docs/
EXPOSE 8080
