import { PreTokenGenerationV2TriggerEvent } from 'aws-lambda';

/**
 * Cognito Pre Token Generation V2 trigger.
 * Injects custom:organizationId from user attributes into BOTH access and ID token claims
 * so the Lambda authorizer can extract it and pass to downstream handlers.
 */
export const handler = async (event: PreTokenGenerationV2TriggerEvent): Promise<PreTokenGenerationV2TriggerEvent> => {
    const organizationId = event.request.userAttributes['custom:organizationId'] || '';

    event.response = {
        claimsAndScopeOverrideDetails: {
            accessTokenGeneration: {
                claimsToAddOrOverride: {
                    'custom:organizationId': organizationId,
                },
            },
            idTokenGeneration: {
                claimsToAddOrOverride: {
                    'custom:organizationId': organizationId,
                },
            },
        },
    };

    return event;
};
