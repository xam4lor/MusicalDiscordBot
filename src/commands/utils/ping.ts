import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Ping the status of the server.'),

    async execute(interaction: ChatInputCommandInteraction) {
        interaction.reply(`Pong! ${interaction.client.ws.ping}ms.`);
    },
};
