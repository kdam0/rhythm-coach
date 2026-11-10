let
  nixpkgs = fetchTarball "https://github.com/NixOS/nixpkgs/archive/nixpkgs-unstable.tar.gz";
  pkgs = import nixpkgs { config = {}; overlays = []; };
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_22
    esbuild
    typescript
    opentofu
  ];

  shellHook = ''
    echo "Dev Shell is ready."
    echo "Run: npm install && npm run build && tofu init && tofu apply"
  '';
}
f
