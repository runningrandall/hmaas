import { PreTokenGenerationTriggerEvent } from 'aws-lambda';

/**
 * Cognito Pre Token Generation V2 trigger.
 * Injects custom:organizationId from user attributes into the access token claims
 * so the Lambda authorizer can extract it and pass to downstream handlers.
 */
export const handler = async (event: PreTokenGenerationTriggerEvent): Promise<PreTokenGenerationTriggerEvent> => {
    const organizationId = event.request.userAttributes['custom:organizationId'] || '';

    event.response = {
        claimsOverrideDetails: {
            claimsToAddOrOverride: {
                'custom:organizationId': organizationId,
            },
        },
    };

    return event;
};
