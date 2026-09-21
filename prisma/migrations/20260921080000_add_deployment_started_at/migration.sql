-- RB Factory Sites: rastreia início do deployment para recuperação segura de operações abandonadas
ALTER TABLE "WebsiteProject" ADD COLUMN "deploymentStartedAt" DATETIME;