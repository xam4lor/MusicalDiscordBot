import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import player from '../../core/player.ts';

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the player and clear the queue.'),

    async execute(interaction: ChatInputCommandInteraction) {
        // Clear the queue
        player.clear();

        // Stop playing music
        player.stop();
        await interaction.reply('Stopped playing music and queue cleared.');
    },
};
