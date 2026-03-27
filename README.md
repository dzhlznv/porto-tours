# porto-tours

Landing page and map experiment for Porto local tours.

## Map experiment branch policy

To keep the branch domain (`map.porto2you.com`) aligned with the latest map experiment:

- All map experiment changes are committed directly to `feature/porto-map`.
- Pull requests for map work must use `feature/porto-map` as the base branch (never `main`).
- Routing updates for `/`, `/map`, and `/home` must be merged into `feature/porto-map`.
- `map.porto2you.com` should track the most recent deployment from `feature/porto-map`.
