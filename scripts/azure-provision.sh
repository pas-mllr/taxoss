#!/bin/sh
# One-time Azure provisioning for TaxOSS (tax-oss.com).
# Requires: az CLI logged in (az login) with the target subscription selected.
#
# Creates: resource group, ACR, storage account + blob container (Litestream
# replica), Container Apps environment, and the container app itself with
# min=max=1 replica (SQLite is single-writer — never scale this out).
#
# After running, follow the printed steps to wire up GitHub Actions OIDC and
# the custom domain.
set -eu

LOCATION="${LOCATION:-westeurope}"
RG="taxoss-rg"
ACR="taxossacr"                 # must be globally unique, alphanumeric only
STORAGE="taxossdb"              # must be globally unique, lowercase alphanumeric
CONTAINER="taxoss-db"           # blob container for the Litestream replica
ENVIRONMENT="taxoss-env"
APP="taxoss"

az group create --name "$RG" --location "$LOCATION" --output none
echo "resource group: $RG"

az acr create --resource-group "$RG" --name "$ACR" --sku Basic --output none
echo "container registry: $ACR.azurecr.io"

az storage account create \
  --resource-group "$RG" --name "$STORAGE" --location "$LOCATION" \
  --sku Standard_LRS --kind StorageV2 --min-tls-version TLS1_2 \
  --allow-blob-public-access false --output none
STORAGE_KEY=$(az storage account keys list \
  --resource-group "$RG" --account-name "$STORAGE" \
  --query '[0].value' --output tsv)
az storage container create \
  --account-name "$STORAGE" --account-key "$STORAGE_KEY" \
  --name "$CONTAINER" --output none
echo "storage: $STORAGE / container: $CONTAINER"

az containerapp env create \
  --resource-group "$RG" --name "$ENVIRONMENT" --location "$LOCATION" \
  --output none
echo "container apps environment: $ENVIRONMENT"

# Bootstrap with a public hello-world image; the deploy workflow replaces it.
# Secrets are created empty-ish here and overwritten with real values below.
az containerapp create \
  --resource-group "$RG" --name "$APP" --environment "$ENVIRONMENT" \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 8080 --ingress external \
  --min-replicas 1 --max-replicas 1 \
  --cpu 0.5 --memory 1.0Gi \
  --registry-server "$ACR.azurecr.io" --registry-identity system \
  --secrets \
      "azure-storage-key=$STORAGE_KEY" \
      "clerk-secret-key=replace-me" \
      "gh-stats-token=replace-me" \
      "admin-user-ids=replace-me" \
      "admin-api-token=replace-me" \
      "brevo-api-key=replace-me" \
  --output none
echo "container app: $APP"

FQDN=$(az containerapp show --resource-group "$RG" --name "$APP" \
  --query 'properties.configuration.ingress.fqdn' --output tsv)

cat <<EOF

Provisioned. Next steps (manual):

1. Real secrets:
   az containerapp secret set -g $RG -n $APP --secrets \\
     clerk-secret-key=sk_live_... gh-stats-token=github_pat_... \\
     admin-user-ids=user_... admin-api-token=... brevo-api-key=...

2. GitHub Actions OIDC (repo pasmllr/taxoss):
   az ad app create --display-name taxoss-deploy
   az ad sp create --id <appId>
   az role assignment create --assignee <appId> --role Contributor \\
     --scope \$(az group show -n $RG --query id -o tsv)
   az ad app federated-credential create --id <appId> --parameters '{
     "name":"taxoss-main",
     "issuer":"https://token.actions.githubusercontent.com",
     "subject":"repo:pasmllr/taxoss:ref:refs/heads/main",
     "audiences":["api://AzureADTokenExchange"]}'
   Then set GitHub secrets: AZURE_CLIENT_ID, AZURE_TENANT_ID,
   AZURE_SUBSCRIPTION_ID, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
   NEXT_PUBLIC_POSTHOG_KEY, BREVO_LIST_ID.

3. Custom domain (tax-oss.com):
   az containerapp hostname add -g $RG -n $APP --hostname tax-oss.com
   -> add the printed asuid TXT record + an A/ALIAS record at your registrar
   az containerapp hostname bind -g $RG -n $APP --hostname tax-oss.com \\
     --environment $ENVIRONMENT --validation-method TXT
   Repeat for www.tax-oss.com (CNAME to $FQDN).

Current app URL: https://$FQDN
EOF
