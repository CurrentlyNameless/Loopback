import { Router } from 'express';
import { REST } from 'discord.js';
import { InteractionManager } from '../../../managers/InteractionManager.ts';
import { ConfigManager } from '../../../managers/ConfigManager.ts';
import { requireAuth, requireGuildManage, paramValue } from '../middleware/auth.ts';

export function loadCommandState(interactionManager: any): void {
    // Restore saved disabled command states
    if (typeof InteractionManager.loadDisabledState === 'function') {
        InteractionManager.loadDisabledState();
    }
}

export default function commandsApi(bot: any): Router {
    const router = Router();

    // List all registered commands
    router.get('/', (_req, res) => {
        const im = bot?.interactionManager ?? bot?.moduleManager;
        const all = im?.allCommands ?? im?.getCommands?.() ?? InteractionManager.getRegisteredCommands() ?? new Map();
        const list: any[] = [];
        const disabled = InteractionManager.getDisabledCommands();

        for (const [name, cmd] of all.entries()) {
            list.push({
                name,
                description: cmd.description || cmd.data?.description || '',
                module: cmd.moduleName || cmd.module || 'core',
                enabled: !disabled.has(name),
            });
        }

        res.json(list);
    });

    // Toggle command globally
    router.patch('/:name', requireAuth, async (req, res) => {
        const name = paramValue(req.params.name);
        const { enabled } = req.body as { enabled?: boolean };

        const config = ConfigManager.get();
        const token = config.discord?.token;
        if (!token) {
            res.status(500).json({ error: 'Discord token not configured' });
            return;
        }

        const rest = new REST({ version: '10' }).setToken(token);
        const result = await InteractionManager.toggleCommandAndSync(name, rest);

        if (!result.success) {
            res.status(500).json({ error: result.error || 'Failed to toggle command' });
            return;
        }

        res.json({ ok: true, name, enabled: InteractionManager.isCommandEnabled(name) });
    });

    return router;
}

export function guildCommandsRouter(bot: any): Router {
    const router = Router();

    // Toggle command in guild scope
    router.patch('/:id/commands/:name', requireAuth, requireGuildManage, async (req, res) => {
        const guildId = paramValue(req.params.id);
        const name = paramValue(req.params.name);
        const { enabled } = req.body as { enabled?: boolean };

        const config = ConfigManager.get();
        const token = config.discord?.token;
        if (!token) {
            res.status(500).json({ error: 'Discord token not configured' });
            return;
        }

        const rest = new REST({ version: '10' }).setToken(token);
        const result = await InteractionManager.toggleCommandAndSync(name, rest, guildId);

        if (!result.success) {
            res.status(500).json({ error: result.error || 'Failed to toggle command in guild' });
            return;
        }

        res.json({ ok: true, name, guildId, enabled: InteractionManager.isCommandEnabled(name) });
    });

    return router;
}
