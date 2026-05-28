/**
 * Регистрация slash-команд
 * Запусти один раз: node deploy-commands.js
 */

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Воспроизвести трек')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Название песни или URL')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Пропустить текущий трек'),
  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Остановить и очистить очередь'),
  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Показать очередь'),
  new SlashCommandBuilder()
    .setName('np')
    .setDescription('Текущий трек'),
  new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Установить громкость')
    .addIntegerOption(opt =>
      opt.setName('level')
        .setDescription('Громкость от 1 до 100')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('📤 Регистрация slash-команд...');

    // Для одного сервера (мгновенно):
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log('✅ Команды зарегистрированы!');
    console.log('');
    console.log('Доступные команды:');
    console.log('  /play <запрос>  — воспроизвести трек');
    console.log('  /skip           — пропустить');
    console.log('  /stop           — остановить');
    console.log('  /queue          — очередь');
    console.log('  /np             — текущий трек');
    console.log('  /volume <1-100> — громкость');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
})();
