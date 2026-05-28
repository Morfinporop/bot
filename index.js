/**
 * SoundForge Discord Music Bot
 * Для Railway.app
 * 
 * ИНСТРУКЦИЯ:
 * 1. Создай новый проект на Railway
 * 2. Загрузи эти файлы (index.js, deploy-commands.js, package.json)
 * 3. Добавь переменные окружения (Variables):
 *    - DISCORD_TOKEN = твой токен бота
 *    - CLIENT_ID = Application ID
 *    - GUILD_ID = ID сервера
 * 4. Railway автоматически установит зависимости и запустит бота
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

// Проверка переменных окружения
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN не установлен!');
  process.exit(1);
}

// Создание клиента
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Создание плеера
const player = new Player(client);

// Загрузка экстракторов
(async () => {
  await player.extractors.loadMulti(DefaultExtractors);
  console.log('✅ Экстракторы загружены: SoundCloud, Spotify, AppleMusic');
})();

// Команды
client.commands = new Collection();

// /play
client.commands.set('play', {
  name: 'play',
  description: 'Воспроизвести трек',
  async execute(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel) {
      return interaction.reply({ content: '❌ Зайди в голосовой канал!', ephemeral: true });
    }

    const query = interaction.options.getString('query', true);
    await interaction.deferReply();

    try {
      const { track } = await player.play(channel, query, {
        nodeOptions: {
          metadata: interaction,
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 60000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 60000,
        },
      });

      const embed = new EmbedBuilder()
        .setColor(0x6366f1)
        .setTitle('🎵 Добавлено в очередь')
        .setDescription(`**${track.title}**\n${track.author}`)
        .setThumbnail(track.thumbnail)
        .setFooter({ text: `Длительность: ${track.duration}` });

      return interaction.followUp({ embeds: [embed] });
    } catch (e) {
      return interaction.followUp({ content: `❌ Ошибка: ${e.message}` });
    }
  },
});

// /skip
client.commands.set('skip', {
  name: 'skip',
  description: 'Пропустить текущий трек',
  async execute(interaction) {
    const queue = player.nodes.get(interaction.guild.id);
    if (!queue || !queue.isPlaying()) {
      return interaction.reply({ content: '❌ Ничего не играет', ephemeral: true });
    }

    const current = queue.currentTrack;
    queue.node.skip();

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setDescription(`⏭️ Пропущено: **${current.title}**`);

    return interaction.reply({ embeds: [embed] });
  },
});

// /stop
client.commands.set('stop', {
  name: 'stop',
  description: 'Остановить воспроизведение',
  async execute(interaction) {
    const queue = player.nodes.get(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
    }

    queue.delete();

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setDescription('⏹️ Воспроизведение остановлено. Очередь очищена.');

    return interaction.reply({ embeds: [embed] });
  },
});

// /queue
client.commands.set('queue', {
  name: 'queue',
  description: 'Показать очередь',
  async execute(interaction) {
    const queue = player.nodes.get(interaction.guild.id);
    if (!queue || queue.tracks.size === 0) {
      return interaction.reply({ content: '📭 Очередь пуста', ephemeral: true });
    }

    const tracks = queue.tracks.map((t, i) => `**${i + 1}.** ${t.title} — ${t.duration}`).slice(0, 10).join('\n');
    const current = queue.currentTrack;

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('📋 Очередь')
      .setDescription(`**Сейчас:** ${current.title}\n\n${tracks}`)
      .setFooter({ text: `Всего: ${queue.tracks.size} треков` });

    return interaction.reply({ embeds: [embed] });
  },
});

// /np (nowplaying)
client.commands.set('np', {
  name: 'np',
  description: 'Текущий трек',
  async execute(interaction) {
    const queue = player.nodes.get(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Ничего не играет', ephemeral: true });
    }

    const track = queue.currentTrack;
    const progress = queue.node.createProgressBar();

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('🎵 Сейчас играет')
      .setDescription(`**${track.title}**\n${track.author}\n\n${progress}`)
      .setThumbnail(track.thumbnail)
      .setFooter({ text: `Длительность: ${track.duration}` });

    return interaction.reply({ embeds: [embed] });
  },
});

// /volume
client.commands.set('volume', {
  name: 'volume',
  description: 'Установить громкость',
  async execute(interaction) {
    const queue = player.nodes.get(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
    }

    const level = interaction.options.getInteger('level', true);
    queue.node.setVolume(level);

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setDescription(`🔊 Громкость: **${level}%**`);

    return interaction.reply({ embeds: [embed] });
  },
});

// События плеера
player.events.on('playerStart', (queue, track) => {
  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle('▶️ Воспроизводится')
    .setDescription(`**${track.title}**\n${track.author}`)
    .setThumbnail(track.thumbnail)
    .setFooter({ text: `Длительность: ${track.duration}` });

  queue.metadata.channel.send({ embeds: [embed] });
});

player.events.on('emptyQueue', (queue) => {
  const embed = new EmbedBuilder()
    .setColor(0x64748b)
    .setDescription('📭 Очередь закончилась. Отключаюсь...');

  queue.metadata.channel.send({ embeds: [embed] });
});

player.events.on('error', (queue, error) => {
  console.error(`[${queue.guild.name}] Ошибка: ${error.message}`);
});

// Обработка команд
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await player.context.provide({ guild: interaction.guild }, () => command.execute(interaction));
  } catch (error) {
    console.error(error);
    const reply = { content: '❌ Произошла ошибка', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Бот онлайн
client.once(Events.ClientReady, (c) => {
  console.log('═══════════════════════════════════════');
  console.log(`✅ SoundForge запущен как ${c.user.tag}`);
  console.log(`📊 Серверов: ${c.guilds.cache.size}`);
  console.log('═══════════════════════════════════════');
});

// Запуск
client.login(process.env.DISCORD_TOKEN);
