import mongoose from "mongoose";
import { Logger } from "../utils/logger.ts";
import { ConfigManager } from "./ConfigManager.ts";

export class DatabaseManager {
    private static isInitialized = false;
    private static reconnectAttempts = 0;
    private static readonly MAX_RECONNECT_ATTEMPTS = 10;
    private static healthCheckTimer: ReturnType<typeof setInterval> | null = null;

    static async connect(): Promise<void> {
        if (this.isInitialized) return;
        const config = ConfigManager.get();

        if (config.database.type !== "mongodb") {
            Logger.warn(`Unsupported database type: ${config.database.type}. Enforcing MongoDB.`, "DatabaseManager");
        }

        const uri = config.database.mongodb?.uri;
        if (!uri) {
            Logger.error("MongoDB URI missing from config. Cannot start database.", "DatabaseManager");
            process.exit(1);
        }

        try {
            await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 10000,
                socketTimeoutMS: 60000,
                maxPoolSize: 10,
                minPoolSize: 2,
                heartbeatFrequencyMS: 10000,
                retryWrites: true,
                retryReads: true,
            });

            this.setupEventHandlers();
            this.startHealthCheck();

            this.isInitialized = true;
            this.reconnectAttempts = 0;
            Logger.success("Connected to MongoDB with connection pooling.", "DatabaseManager");
        } catch (error) {
            Logger.error("Failed to connect to MongoDB!", "DatabaseManager", error);
            process.exit(1);
        }
    }

    private static setupEventHandlers(): void {
        mongoose.connection.removeAllListeners();

        mongoose.connection.on("disconnected", () => {
            Logger.warn("MongoDB disconnected — attempting reconnect", "DatabaseManager");
            this.handleReconnect();
        });

        mongoose.connection.on("reconnected", () => {
            Logger.success("MongoDB reconnected", "DatabaseManager");
            this.reconnectAttempts = 0;
        });

        mongoose.connection.on("error", (err) => {
            Logger.error("MongoDB connection error", "DatabaseManager", err);
        });
    }

    private static async handleReconnect(): Promise<void> {
        if (!this.isInitialized) return;
        if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            Logger.error("Max reconnect attempts reached. Giving up.", "DatabaseManager");
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

        Logger.info(`Reconnect attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} in ${delay}ms`, "DatabaseManager");

        await new Promise((resolve) => setTimeout(resolve, delay));

        try {
            const config = ConfigManager.get();
            const uri = config.database.mongodb?.uri;
            if (!uri) return;

            if (mongoose.connection.readyState === 0) {
                await mongoose.connect(uri, {
                    serverSelectionTimeoutMS: 5000,
                    connectTimeoutMS: 10000,
                    socketTimeoutMS: 60000,
                    maxPoolSize: 10,
                    minPoolSize: 2,
                    heartbeatFrequencyMS: 10000,
                    retryWrites: true,
                    retryReads: true,
                });
                Logger.success("MongoDB reconnection successful", "DatabaseManager");
                this.reconnectAttempts = 0;
            }
        } catch (err) {
            Logger.error(`Reconnect attempt ${this.reconnectAttempts} failed`, "DatabaseManager", err);
            this.handleReconnect();
        }
    }

    private static startHealthCheck(): void {
        if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);

        this.healthCheckTimer = setInterval(async () => {
            if (mongoose.connection.readyState !== 1) return;

            try {
                await mongoose.connection.db?.admin().ping();
            } catch {
                Logger.warn("Health check failed — connection may be stale", "DatabaseManager");
            }
        }, 30000);
    }

    static async disconnect(): Promise<void> {
        if (!this.isInitialized) return;
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        await mongoose.disconnect();
        this.isInitialized = false;
        this.reconnectAttempts = 0;
        Logger.info("Database connection closed.", "DatabaseManager");
    }

    static isConnected(): boolean {
        return mongoose.connection.readyState === 1;
    }

    static async ensureConnected(timeoutMs: number = 10000): Promise<boolean> {
        if (mongoose.connection.readyState === 1) return true;

        const start = Date.now();
        while (mongoose.connection.readyState !== 1 && (Date.now() - start) < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return mongoose.connection.readyState === 1;
    }

    static registerModel<T>(name: string, schema: mongoose.Schema): mongoose.Model<T> {
        return (mongoose.models[name] as mongoose.Model<T>) || mongoose.model<T>(name, schema);
    }
}
