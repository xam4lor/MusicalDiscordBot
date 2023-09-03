import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import player from '../../core/player.ts';

export default {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Find the lyrics of a track by searching on google.'),

    async execute(interaction: ChatInputCommandInteraction) {
        player.lyrics(interaction);
    },
};
