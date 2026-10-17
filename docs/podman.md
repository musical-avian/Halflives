# Run locally with Podman

The app is plain static files, so any web server works. The `Containerfile` wraps them in rootless-friendly nginx.

```sh
make start      # build image + run in background → http://localhost:8080
make stop       # stop it
make restart    # rebuild + restart
make dev        # serve the working tree live (no rebuild)
make help       # all targets; PORT=9000 make start for another port
```

Without make:

```sh
podman build -t halflives .
podman run --rm -p 8080:8080 halflives
```

Live-edit without rebuilding (mount the repo read-only; `:Z` relabels for SELinux):

```sh
podman run --rm -p 8080:8080 -v ./:/usr/share/nginx/html:ro,Z docker.io/nginxinc/nginx-unprivileged:alpine
```

No Podman? `python3 -m http.server 8080` in the repo folder does the same.

Opening `index.html` straight from disk (`file://`) won't work: browsers block ES modules and `fetch` there.
