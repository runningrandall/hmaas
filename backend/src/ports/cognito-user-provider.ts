import { CognitoUser } from "../domain/organization";

export interface CognitoUserProvider {
    listAdminUsers(): Promise<CognitoUser[]>;
}
