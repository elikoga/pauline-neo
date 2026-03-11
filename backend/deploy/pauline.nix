# Prerequisites before first deploy:
#
#   sudo mkdir -p /srv/pauline/prod /srv/pauline/dev
#   sudo cp deploy/prod/docker-compose.yml /srv/pauline/prod/docker-compose.yml
#   sudo cp deploy/dev/docker-compose.yml  /srv/pauline/dev/docker-compose.yml
#
# After nixos-rebuild switch, restore prod DB with:
#   sudo docker compose -f /srv/pauline/prod/docker-compose.yml exec -T db \
#     psql -U pauline pauline < /tmp/pauline_dump_YYYYMMDD.sql
#
# CI access: add the 'deploy' user's SSH public key to /etc/nixos
#   and include a users.users.deploy entry (authorized key + docker group membership).

{ config, pkgs, lib, ... }:

{
  virtualisation.docker = {
    enable = true;
    autoPrune = {
      enable = true;
      dates = "weekly";
    };
  };

  systemd.services.pauline-prod = {
    description = "Pauline production stack";
    after = [ "docker.service" "network-online.target" ];
    wants = [ "network-online.target" ];
    requires = [ "docker.service" ];
    wantedBy = [ "multi-user.target" ];

    serviceConfig = {
      Type = "simple";
      WorkingDirectory = "/srv/pauline/prod";
      ExecStart = "${pkgs.docker}/bin/docker compose up";
      ExecStop  = "${pkgs.docker}/bin/docker compose down";
      Restart    = "on-failure";
      RestartSec = "10s";
    };
  };

  systemd.services.pauline-dev = {
    description = "Pauline development stack";
    after = [ "docker.service" "network-online.target" ];
    wants = [ "network-online.target" ];
    requires = [ "docker.service" ];
    wantedBy = [ "multi-user.target" ];

    serviceConfig = {
      Type = "simple";
      WorkingDirectory = "/srv/pauline/dev";
      ExecStart = "${pkgs.docker}/bin/docker compose up";
      ExecStop  = "${pkgs.docker}/bin/docker compose down";
      Restart    = "on-failure";
      RestartSec = "10s";
    };
  };

  services.nginx = {
    enable = true;

    commonHttpConfig = ''
      proxy_http_version 1.1;
      proxy_set_header Host              $host;
      proxy_set_header X-Real-IP         $remote_addr;
      proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    '';

    virtualHosts."pauline-upb.de" = {
      # enableACME = true;
      # forceSSL   = true;

      locations."/api" = {
        proxyPass = "http://127.0.0.1:8000";
      };

      locations."/docs" = {
        proxyPass = "http://127.0.0.1:8000";
      };

      locations."/" = {
        proxyPass = "http://127.0.0.1:3000";
      };
    };

    virtualHosts."dev.pauline-upb.de" = {
      # enableACME = true;
      # forceSSL   = true;

      locations."/api" = {
        proxyPass = "http://127.0.0.1:8001";
      };

      locations."/docs" = {
        proxyPass = "http://127.0.0.1:8001";
      };

      locations."/" = {
        proxyPass = "http://127.0.0.1:3001";
      };
    };
  };

  networking.firewall.allowedTCPPorts = [ 80 443 ];
}
