{
  description = "Pauline Neo";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.uv
            pkgs.python313
            pkgs.nodejs_22
            pkgs.postgresql
          ];
          shellHook = ''
            export PAULINE_DEV_SHELL=true
            export PAULINE_FLAKE_ROOT=$(git rev-parse --show-toplevel)
            alias run-dev="(cd $PAULINE_FLAKE_ROOT/backend && uv run uvicorn app.api:app --reload --host 127.0.0.1 --port 8000)"
            alias setup-db="bash $PAULINE_FLAKE_ROOT/scripts/dev-setup.sh"
            echo "setup-db  — load prod dump into local postgres (run once per fresh DB)"
            echo "run-dev   — start backend + proxied frontend on :8000"
          '';
        };
      });
}
