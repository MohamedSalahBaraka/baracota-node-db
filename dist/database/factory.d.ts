import { DatabaseConfig, DatabaseConnection } from "../types/interfaces";
export declare class DatabaseFactory {
    static createConnection(config: DatabaseConfig): Promise<DatabaseConnection>;
}
