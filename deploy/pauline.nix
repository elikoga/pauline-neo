# deploy/pauline.nix — NixOS module for the pauline-neo server.
#
# Include in the host config:
#   imports = [ /srv/pauline/pauline.nix ];
#
#
# ── First-time setup ──────────────────────────────────────────────────────────
#
# 1. Copy compose file and create the env file:
#
#      mkdir -p /srv/pauline
#      cp deploy/docker-compose.yml /srv/pauline/
#
#      cat > /srv/pauline/.env <<'EOF'
#      PREVIEW_DOMAIN=preview.pauline-upb.de
#      POSTGRES_SERVER=...
#      POSTGRES_USER=pauline
#      POSTGRES_PASSWORD=...
#      POSTGRES_DB=pauline
#      BASE_URL=https://pauline-upb.de
#      EOF
#
# 2. Copy hook scripts and config:
#
#      mkdir -p /etc/webhook
#      cp deploy/hooks/*.sh /etc/webhook/
#      chmod +x /etc/webhook/*.sh
#      cp deploy/hooks/hooks.json /etc/webhook/
#      # Edit hooks.json: replace REPLACE_WITH_WEBHOOK_SECRET
#
# 3. Create the webhook secrets file (not in VCS):
#
#      cat > /etc/webhook/environment <<'EOF'
#      WEBHOOK_SECRET=<random — must match GitHub secret WEBHOOK_SECRET>
#      GHCR_USER=elikoga
#      GHCR_TOKEN=<PAT with read:packages>
#      PREVIEW_DOMAIN=preview.pauline-upb.de
#      DB_HOST=<postgres host>
#      DB_USER=pauline
#      DB_PASSWORD=<password>
#      DB_NAME=pauline
#      COMPOSE_DIR=/srv/pauline
#      EOF
#      chmod 600 /etc/webhook/environment
#
# 4. DNS — point both records at the server IP:
#      pauline-upb.de            A  <ip>
#      preview.pauline-upb.de    A  <ip>
#      *.preview.pauline-upb.de  A  <ip>
#
# 5. Wildcard ACME (DNS-01 — required for wildcards).
#    Add a block like this alongside the module import, adapted to your DNS
#    provider (see https://go-acme.github.io/lego/dns/):
#
#      security.acme.certs."preview.pauline-upb.de" = {
#        domain          = "*.preview.pauline-upb.de";
#        extraDomainNames = [ "preview.pauline-upb.de" ];
#        dnsProvider     = "cloudflare";          # or hetzner, etc.
#        credentialsFile = "/run/secrets/acme-dns-creds";
#        group           = config.services.nginx.group;
#      };
#
# 6. GitHub repo secrets:
#      WEBHOOK_URL     https://pauline-upb.de/webhooks
#      WEBHOOK_SECRET  same value as in /etc/webhook/environment
#
# ── Architecture on this host ─────────────────────────────────────────────────
#
#   nginx (:80/:443)
#     pauline-upb.de             → 127.0.0.1:8000  (pauline-prod container)
#     pauline-upb.de/webhooks/   → 127.0.0.1:9000  (webhook receiver)
#     *.preview.pauline-upb.de   → 127.0.0.1:8080  (Traefik)
#
#   Traefik (:8080, HTTP-only)
#     routes by Host header to ephemeral preview containers on the pauline network
#
#   webhook (:9000)
#     deploy-preview  — docker run with Traefik labels
#     teardown-preview — docker rm
#     deploy-prod     — docker compose up --no-deps pauline-prod

{ config, pkgs, lib, ... }:

{
  virtualisation.docker = {
    enable = true;
    autoPrune = {
      enable = true;
      dates   = "weekly";
    };
  };

  # ── Pauline stack (Traefik + prod container) ────────────────────────────────
  systemd.services.pauline = {
    description = "Pauline stack (prod app + preview Traefik)";
    after    = [ "docker.service" "network-online.target" ];
    wants    = [ "network-online.target" ];
    requires = [ "docker.service" ];
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      Type             = "simple";
      WorkingDirectory = "/srv/pauline";
      EnvironmentFile  = "/srv/pauline/.env";
      ExecStart        = "${pkgs.docker}/bin/docker compose up --remove-orphans";
      ExecStop         = "${pkgs.docker}/bin/docker compose down";
      Restart          = "on-failure";
      RestartSec       = "10s";
    };
  };

  # ── Webhook receiver ────────────────────────────────────────────────────────
  # Runs deploy/teardown scripts triggered by CI.
  # Needs docker group access to manage containers.
  systemd.services.pauline-webhook = {
    description = "Pauline webhook receiver";
    after    = [ "docker.service" "network-online.target" ];
    wants    = [ "network-online.target" ];
    requires = [ "docker.service" ];
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      ExecStart       = "${pkgs.webhook}/bin/webhook -hooks /etc/webhook/hooks.json -port 9000 -verbose";
      EnvironmentFile = "/etc/webhook/environment";
      # docker group lets the scripts reach the Docker socket without root.
      SupplementaryGroups = [ "docker" ];
      Restart    = "on-failure";
      RestartSec = "5s";
    };
  };

  # ── nginx ───────────────────────────────────────────────────────────────────
  services.nginx = {
    enable = true;

    # WebSocket upgrade map — needed for SvelteKit streaming and HMR.
    commonHttpConfig = ''
      map $http_upgrade $connection_upgrade {
        default upgrade;
        ""      close;
      }
      proxy_http_version 1.1;
      proxy_set_header Host              $host;
      proxy_set_header X-Real-IP         $remote_addr;
      proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header Upgrade           $http_upgrade;
      proxy_set_header Connection        $connection_upgrade;
    '';

    virtualHosts."pauline-upb.de" = {
      enableACME = true;
      forceSSL   = true;

      locations."/" = {
        proxyPass = "http://127.0.0.1:8000";
      };

      # Webhook endpoint proxied here so port 9000 stays off the internet.
      # CI WEBHOOK_URL = https://pauline-upb.de/webhooks
      locations."/webhooks/" = {
        proxyPass = "http://127.0.0.1:9000/";
      };
    };

    # Preview branches: *.preview.pauline-upb.de → Traefik.
    # Traefik routes by Host header to the matching preview container.
    # Requires wildcard TLS — configure security.acme DNS-01 (see header).
    virtualHosts."preview.pauline-upb.de" = {
      serverAliases = [ "*.preview.pauline-upb.de" ];
      forceSSL      = true;
      useACMEHost   = "preview.pauline-upb.de";
      locations."/" = {
        proxyPass = "http://127.0.0.1:8080";
      };
    };
  };

  networking.firewall.allowedTCPPorts = [ 80 443 ];
}
