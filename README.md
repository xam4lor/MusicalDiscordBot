# MusicalDiscordBot
![Avatar](avatar.png)

A bot that can be used on a discord server to play music from youtube.

## Setup
- Create a file called `config.json` in the root directory based on the `config.template.json` file.
- Fill in the properties in the `config.json` file with your own API discord tokens.
- Run `npm run deploy` once to register the slash commands with discord.
- Run `npm run start` each time you want to start the bot.
- Invite the bot to your server using the link `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands`
- Enjoy!

## Commands
- To see all commands type `/help` in a text channel.
