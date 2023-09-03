import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import player from '../../core/player.ts';

export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current playing song.'),

    async execute(interaction: ChatInputCommandInteraction) {
        const skipped = player.skip();
        if (!skipped) return await interaction.reply('No music is playing.');
        await interaction.reply('Skipped current song.');
    },
};
