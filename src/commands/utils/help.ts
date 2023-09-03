import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('List all of my commands.'),

    async execute(interaction: ChatInputCommandInteraction) {
        interaction.reply(`SHESH`)
    },
};
