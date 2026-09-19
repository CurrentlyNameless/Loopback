import chalk from "chalk";
import { ErrorManager, SerializedErrorEntry } from "../managers/ErrorManager.ts";
import { ErrorHexCodes } from "../errors/FloofcoreError.ts";

export class ErrorInspector {
    public static printAllErrors(limit: number = 30): void {
        const errors = ErrorManager.getErrors({ limit });

        console.log("\n" + chalk.bgRed.bold.white(" 🚨 FLOOFCORE ERROR INSPECTOR — ALL RECORDED ERRORS 🚨 "));
        console.log(chalk.red("═".repeat(80)));

        if (errors.length === 0) {
            console.log(chalk.green(" ✨ No recorded errors found across Core or any modules!"));
            console.log(chalk.red("═".repeat(80)) + "\n");
            return;
        }

        const moduleStats: Record<string, number> = {};

        errors.forEach((err, index) => {
            const modName = err.moduleName || "Core";
            moduleStats[modName] = (moduleStats[modName] || 0) + 1;

            const timeStr = err.timestamp ? new Date(err.timestamp).toLocaleTimeString("en-US", { hour12: false }) : "UNKNOWN_TIME";
            const numHeader = chalk.gray(`[${index + 1}/${errors.length}]`);
            const modTag = chalk.bgHex("#333333").cyan(` ${modName} `);
            const hexStr = err.hexCode || ErrorHexCodes[err.code as any] || "0x0000";
            const codeTag = chalk.bgYellow.black(` ${hexStr} | ${err.code || "UNKNOWN_ERROR"} `);
            const nameTag = chalk.red.bold(err.name || "Error");

            console.log(`${numHeader} ${modTag} ${codeTag} ${nameTag} ${chalk.gray(`at ${timeStr}`)}`);
            console.log(`  ${chalk.red("├─ Message:")} ${chalk.white(err.message)}`);

            if (err.stack) {
                const stackLines = err.stack.split("\n").slice(1, 3);
                stackLines.forEach((line) => {
                    console.log(`  ${chalk.gray("│  " + line.trim())}`);
                });
            }
            console.log(chalk.gray("─".repeat(80)));
        });

        const statsFormatted = Object.entries(moduleStats)
            .map(([mod, count]) => `${chalk.cyan(mod)}: ${chalk.yellow(count)}`)
            .join("  |  ");

        console.log(chalk.bold(` 📊 Summary: ${chalk.red(errors.length)} errors displayed`));
        console.log(` 📁 Module Breakdown: ${statsFormatted}`);
        console.log(chalk.red("═".repeat(80)) + "\n");
    }

    public static printModuleErrors(moduleName: string, limit: number = 20): void {
        const errors = ErrorManager.getErrors({ moduleName, limit });

        console.log("\n" + chalk.bgHex("#FF4757").bold.white(` 🚨 ERROR INSPECTOR — MODULE: ${moduleName.toUpperCase()} 🚨 `));
        console.log(chalk.hex("#FF4757")("═".repeat(80)));

        if (errors.length === 0) {
            console.log(chalk.green(` ✨ No recorded errors found for module '${moduleName}'!`));
            console.log(chalk.hex("#FF4757")("═".repeat(80)) + "\n");
            return;
        }

        errors.forEach((err, index) => {
            const timeStr = err.timestamp ? new Date(err.timestamp).toLocaleTimeString("en-US", { hour12: false }) : "UNKNOWN_TIME";
            const hexStr = err.hexCode || ErrorHexCodes[err.code as any] || "0x0000";
            console.log(`${chalk.gray(`[${index + 1}/${errors.length}]`)} ${chalk.yellow(`[${hexStr} | ${err.code}]`)} ${chalk.red.bold(err.name)} ${chalk.gray(`(${timeStr})`)}`);
            console.log(`  ${chalk.red("├─ Message:")} ${chalk.white(err.message)}`);
            if (err.stack) {
                const stackLines = err.stack.split("\n").slice(1, 3);
                stackLines.forEach((line) => {
                    console.log(`  ${chalk.gray("│  " + line.trim())}`);
                });
            }
            console.log(chalk.gray("─".repeat(80)));
        });

        console.log(chalk.bold(` 📊 Module '${moduleName}' Total Errors: ${chalk.red(errors.length)}`));
        console.log(chalk.hex("#FF4757")("═".repeat(80)) + "\n");
    }
}
