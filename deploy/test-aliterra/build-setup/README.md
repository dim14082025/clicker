# build-setup/

Snapshot of the Vite project that produces the production `frontend/`
bundle in this deploy folder. The actual source lives in
`react-web-ui/LuxUI.tsx` (one level up); these files are the surrounding
build harness Devin uses to compile it into a static `dist/`.

## Reproducing the build

```bash
# 1. Clone this repo and `cd` to its root
cd react-web-ui && npm install

# 2. Create a sibling workspace using the files in this folder
cd ..
mkdir -p ../lux-preview/src
ln -sf $(pwd)/react-web-ui/LuxUI.tsx       ../lux-preview/src/LuxUI.tsx
ln -sf $(pwd)/react-web-ui/thirdweb-config.ts ../lux-preview/src/thirdweb-config.ts
ln -sf $(pwd)/react-web-ui/public          ../lux-preview/public
cp deploy/test-aliterra/build-setup/* ../lux-preview/
cd ../lux-preview && npm install

# 3. Build the production bundle calling the PHP backend
VITE_API_BASE=/api/v2 VITE_API_SUFFIX=.php npm run build
# Output: ../lux-preview/dist/
```

`dist/` is what gets dropped into the `frontend/` folder of the
deploy zip.

## Critical config notes

- `resolve.dedupe = ["react", "react-dom", ...]` + `resolve.alias` for
  react/react-dom **must** stay in `vite.config.ts`. Without them, the
  symlinked LuxUI.tsx pulls a second copy of React from its own
  `node_modules/react`, and the bundled app crashes at boot with
  `Cannot read properties of null (reading 'useState')`.
- `optimizeDeps.include` keeps ethers + react in pre-bundling so dev
  mode reload doesn't try to dual-import them.
- `VITE_API_BASE=/api/v2` and `VITE_API_SUFFIX=.php` together tell the
  client to call `/api/v2/<endpoint>.php` URLs — which is what the
  PHP backend in `../backend-php/` serves with no nginx rewrite needed.
