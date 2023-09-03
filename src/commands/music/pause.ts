import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import player from '../../player/player.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the player.'),

    async execute(interaction: ChatInputCommandInteraction) {
        const pauseStatus = player.pause();
        await interaction.reply(pauseStatus ? 'Pausing music.' : 'Music is already paused.');
    },
};
