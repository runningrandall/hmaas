import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { superAdminMiddleware } from "../../lib/middleware";
import { CognitoUserProviderAdapter } from "../../adapters/cognito-user-provider";

const cognitoProvider = new CognitoUserProviderAdapter(process.env.USER_POOL_ID || "");

const baseHandler = async (_event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const users = await cognitoProvider.listAdminUsers();
    return { statusCode: 200, body: JSON.stringify(users) };
};

export const handler = superAdminMiddleware(baseHandler);
