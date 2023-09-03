import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import player from '../../core/player.ts';

export default {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leave the audio channel and clear the queue.'),

    async execute(interaction: ChatInputCommandInteraction) {
        // Clear the queue
        player.clear();

        // Leave voice channel
        player.unsubscribe();
        await interaction.reply('Voice channel left and queue cleared.');

        // Stop playing music
        player.stop();
    },
};
