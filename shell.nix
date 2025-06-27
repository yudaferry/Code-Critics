{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs_22
    pkgs.yarn-berry
  ];

  shellHook = ''
    echo "🔧 Nix shell for Code Critics is active."
    yarn --version
  '';
}
