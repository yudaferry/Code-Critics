{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  # The build inputs (tools) available in the shell.
  buildInputs = [
    # Node.js LTS version 22
    pkgs.nodejs_22
    
    # Corepack for managing package managers like Yarn
    pkgs.corepack
  ];

  # Shell hook to run when entering the environment.
  # This ensures corepack is enabled automatically.
  shellHook = ''
    echo "Nix shell for Code Critics is active."

    # Ensure any previously enabled global Yarn shim is disabled so that
    # `yarn` is only available via this Nix shell.
    corepack disable yarn 2>/dev/null || true

    # Ensure a project-local directory for Corepack shims
    COREPACK_HOME="$PWD/.corepack"
    mkdir -p "$COREPACK_HOME"

    # Download and activate Yarn 4 only for this shell session
    corepack prepare yarn@4.9.2 --activate --install-directory "$COREPACK_HOME"

    # Prepend the local shim directory to PATH so `yarn` resolves correctly
    export PATH="$COREPACK_HOME:$PATH"
  '';
} 