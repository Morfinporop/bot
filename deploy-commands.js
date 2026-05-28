/**
 * Регистрация slash-команд
 * Запусти: node deploy-commands.js
 */

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  console.error('❌ Установи DISCORD_TOKEN и CLIENT_ID!');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('🎵 Воспроизвести трек или плейлист')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Название, URL (SoundCloud, Spotify, Apple Music)')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('⏭️ Пропустить текущий трек'),

  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('⏹️ Остановить и очистить очередь'),

  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('⏸️ Поставить на паузу'),

  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('▶️ Продолжить воспроизведение'),

  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('📋 Показать очередь'),

  new SlashCommandBuilder()
    .setName('np')
    .setDescription('🎵 Текущий трек с кнопками управления'),

  new SlashCommandBuilder()
    .setName('volume')
    .setDescription('🔊 Установить громкость')
    .addIntegerOption(opt =>
      opt.setName('level')
        .setDescription('Громкость от 1 до 100')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('🔀 Перемешать очередь'),

  new SlashCommandBuilder()
    .setName('loop')
    .setDescription('🔁 Режим повтора')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Режим повтора')
        .setRequired(true)
        .addChoices(
          { name: 'Выключить', value: 'off' },
          { name: 'Повтор трека', value: 'track' },
          { name: 'Повтор очереди', value: 'queue' }
        )
    ),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('🗑️ Очистить очередь (не останавливает текущий трек)'),

  new SlashCommandBuilder()
    .setName('jump')
    .setDescription('⏩ Перейти к треку в очереди')
    .addIntegerOption(opt =>
      opt.setName('position')
        .setDescription('Номер трека в очереди')
        .setRequired(true)
        .setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName('seek')
    .setDescription('⏩ Перемотать на указанное время')
    .addIntegerOption(opt =>
      opt.setName('seconds')
        .setDescription('Время в секундах')
        .setRequired(true)
        .setMinValue(0)
    ),

  new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('📝 Найти текст песни')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Название песни (или оставь пустым для текущего трека)')
        .setRequired(false)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('');
    console.log('📤 Регистрация команд...');
    console.log('');

    if (process.env.GUILD_ID) {
      // Для одного сервера (мгновенно)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Команды зарегистрированы для сервера ${process.env.GUILD_ID}`);
    } else {
      // Глобально (до 1 часа)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Команды зарегистрированы глобально (подожди до 1 часа)');
    }

    console.log('');
    console.log('📋 Доступные команды:');
    console.log('────────────────────────────────');
    console.log('/play <запрос>     — воспроизвести');
    console.log('/skip              — пропустить');
    console.log('/stop              — остановить');
    console.log('/pause             — пауза');
    console.log('/resume            — продолжить');
    console.log('/queue             — очередь');
    console.log('/np                — текущий трек + кнопки');
    console.log('/volume <1-100>    — громкость');
    console.log('/shuffle           — перемешать');
    console.log('/loop <режим>      — повтор');
    console.log('/clear             — очистить очередь');
    console.log('/jump <номер>      — перейти к треку');
    console.log('/seek <секунды>    — перемотка');
    console.log('/lyrics [запрос]   — текст песни');
    console.log('────────────────────────────────');
    console.log('');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
})();
