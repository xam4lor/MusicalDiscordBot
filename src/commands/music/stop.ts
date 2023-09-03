import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import player from '../../player/player.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the player and clear the queue.'),

    async execute(interaction: ChatInputCommandInteraction) {
        // Stop playing music
        player.stop();
        await interaction.reply('Stopped playing music and queue cleared.');
    },
};
