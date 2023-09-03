import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import player from '../../player/player.js';

export default {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leave the audio channel and clear the queue.'),

    async execute(interaction: ChatInputCommandInteraction) {
        // Leave voice channel
        player.unsubscribe();
        await interaction.reply('Voice channel left and queue cleared.');

        // Stop playing music
        player.stop();
    },
};
