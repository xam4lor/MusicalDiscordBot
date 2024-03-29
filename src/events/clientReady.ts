import { Client, Events } from 'discord.js';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
        console.log(`Logged in as ${client.user?.tag}.`);
    }
}