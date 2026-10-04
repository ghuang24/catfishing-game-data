@description('Short lowercase name used to generate globally unique resource names.')
@minLength(3)
@maxLength(20)
param baseName string = 'catfishing'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Allowed browser origin for Blob Storage CORS. Use * only for intentionally public data.')
param allowedOrigin string = '*'

var token = toLower(uniqueString(subscription().subscriptionId, resourceGroup().id, baseName))
var runtimeStorageName = take('stfn${token}', 24)
var dataStorageName = take('stdata${token}', 24)
var identityName = 'id-${baseName}-${token}'
var planName = 'plan-${baseName}-${token}'
var functionAppName = take('func-${baseName}-${token}', 60)
var workspaceName = 'log-${baseName}-${token}'
var appInsightsName = 'appi-${baseName}-${token}'
var deploymentContainerName = 'app-package'
var dataContainerName = 'data'
var dataBlobName = 'game-data.jsonl'

resource runtimeStorage 'Microsoft.Storage/storageAccounts@2025-01-01' = {
  name: runtimeStorageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
  }
}

resource runtimeBlobService 'Microsoft.Storage/storageAccounts/blobServices@2025-01-01' = {
  parent: runtimeStorage
  name: 'default'
  properties: {}
}

resource deploymentContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-01-01' = {
  parent: runtimeBlobService
  name: deploymentContainerName
  properties: {
    publicAccess: 'None'
  }
}

resource dataStorage 'Microsoft.Storage/storageAccounts@2025-01-01' = {
  name: dataStorageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: true
    allowSharedKeyAccess: true
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
  }
}

resource dataBlobService 'Microsoft.Storage/storageAccounts/blobServices@2025-01-01' = {
  parent: dataStorage
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedHeaders: []
          allowedMethods: [
            'GET'
            'HEAD'
          ]
          allowedOrigins: [
            allowedOrigin
          ]
          exposedHeaders: [
            'Content-Encoding'
            'Content-Length'
            'Content-Type'
            'ETag'
          ]
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

resource dataContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-01-01' = {
  parent: dataBlobService
  name: dataContainerName
  properties: {
    publicAccess: 'Blob'
  }
}

resource functionIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
}

resource plan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: planName
  location: location
  kind: 'functionapp'
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true
  }
}

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: workspaceName
  location: location
  properties: {
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    DisableLocalAuth: false
    Flow_Type: 'Bluefield'
    IngestionMode: 'LogAnalytics'
    Request_Source: 'rest'
    RetentionInDays: 90
    WorkspaceResourceId: workspace.id
  }
}

var blobDataOwnerRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
)
var blobDataContributorRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
)
var queueDataContributorRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
)

resource runtimeBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(runtimeStorage.id, functionIdentity.id, blobDataOwnerRoleId)
  scope: runtimeStorage
  properties: {
    principalId: functionIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: blobDataOwnerRoleId
  }
}

resource runtimeQueueRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(runtimeStorage.id, functionIdentity.id, queueDataContributorRoleId)
  scope: runtimeStorage
  properties: {
    principalId: functionIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: queueDataContributorRoleId
  }
}

resource dataBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(dataStorage.id, functionIdentity.id, blobDataContributorRoleId)
  scope: dataStorage
  properties: {
    principalId: functionIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: blobDataContributorRoleId
  }
}

resource functionApp 'Microsoft.Web/sites@2024-11-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${functionIdentity.id}': {}
    }
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${runtimeStorage.properties.primaryEndpoints.blob}${deploymentContainerName}'
          authentication: {
            type: 'UserAssignedIdentity'
            userAssignedIdentityResourceId: functionIdentity.id
          }
        }
      }
      runtime: {
        name: 'node'
        version: '22'
      }
      scaleAndConcurrency: {
        instanceMemoryMB: 2048
        maximumInstanceCount: 10
      }
    }
    siteConfig: {
      alwaysOn: false
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'AZURE_CLIENT_ID'
          value: functionIdentity.properties.clientId
        }
        {
          name: 'AzureWebJobsStorage__blobServiceUri'
          value: runtimeStorage.properties.primaryEndpoints.blob
        }
        {
          name: 'AzureWebJobsStorage__clientId'
          value: functionIdentity.properties.clientId
        }
        {
          name: 'AzureWebJobsStorage__credential'
          value: 'managedidentity'
        }
        {
          name: 'AzureWebJobsStorage__queueServiceUri'
          value: runtimeStorage.properties.primaryEndpoints.queue
        }
        {
          name: 'DATA_BLOB_NAME'
          value: dataBlobName
        }
        {
          name: 'DATA_CONTAINER_NAME'
          value: dataContainerName
        }
        {
          name: 'DATA_STORAGE_ACCOUNT_URL'
          value: dataStorage.properties.primaryEndpoints.blob
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
      ]
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
  dependsOn: [
    runtimeBlobRole
    runtimeQueueRole
    dataBlobRole
  ]
}

output functionAppName string = functionApp.name
output dataStorageAccountName string = dataStorage.name
output dataContainerName string = dataContainer.name
output dataBlobName string = dataBlobName
output dataBlobUrl string = '${dataStorage.properties.primaryEndpoints.blob}${dataContainerName}/${dataBlobName}'
