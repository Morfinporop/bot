/**
 * SoundForge Discord Music Bot
 * С кнопками управления как в VK Music
 */

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActivityType
} = require('discord.js');
const { Player, useQueue, useMainPlayer } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

// Проверка токена
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN не установлен в переменных окружения!');
  console.error('Добавь его в Railway: Variables → DISCORD_TOKEN');
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
const player = new Player(client, {
  ytdlOptions: {
    quality: 'highestaudio',
    highWaterMark: 1 << 25
  }
});

// Загрузка экстракторов
player.extractors.loadMulti(DefaultExtractors).then(() => {
  console.log('✅ Экстракторы загружены');
});

// ═══════════════════════════════════════
// КНОПКИ УПРАВЛЕНИЯ (как в VK Music)
// ═══════════════════════════════════════

function createPlayerButtons(isPaused = false, hasQueue = true) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('player_prev')
      .setEmoji('⏮️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(isPaused ? 'player_resume' : 'player_pause')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('player_skip')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('player_stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('player_shuffle')
      .setEmoji('🔀')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('player_loop')
      .setEmoji('🔁')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('player_queue')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('player_vol_down')
      .setEmoji('🔉')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('player_vol_up')
      .setEmoji('🔊')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

function createNowPlayingEmbed(track, queue) {
  const progress = queue.node.createProgressBar({
    timecodes: true,
    length: 15
  });

  const loopModes = { 0: 'Выкл', 1: 'Трек', 2: 'Очередь' };

  return new EmbedBuilder()
    .setColor(0x0ea5e9) // Голубой
    .setAuthor({ name: '🎵 Сейчас играет' })
    .setTitle(track.title)
    .setURL(track.url)
    .setDescription(`**${track.author}**\n\n${progress}`)
    .setThumbnail(track.thumbnail)
    .addFields(
      { name: '⏱️ Длительность', value: track.duration, inline: true },
      { name: '🔊 Громкость', value: `${queue.node.volume}%`, inline: true },
      { name: '🔁 Повтор', value: loopModes[queue.repeatMode], inline: true },
      { name: '📋 В очереди', value: `${queue.tracks.size} треков`, inline: true },
    )
    .setFooter({ text: `Запросил: ${track.requestedBy?.username || 'Неизвестно'}` })
    .setTimestamp();
}

// ═══════════════════════════════════════
// ОБРАБОТКА КНОПОК
// ═══════════════════════════════════════

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('player_')) return;

  const queue = useQueue(interaction.guild.id);
  
  // Проверка голосового канала
  const memberVoice = interaction.member.voice.channel;
  if (!memberVoice) {
    return interaction.reply({ content: '❌ Зайди в голосовой канал!', ephemeral: true });
  }

  const action = interaction.customId.replace('player_', '');

  try {
    switch (action) {
      case 'pause':
        if (!queue || !queue.isPlaying()) {
          return interaction.reply({ content: '❌ Ничего не играет', ephemeral: true });
        }
        queue.node.pause();
        await interaction.update({
          embeds: [createNowPlayingEmbed(queue.currentTrack, queue)],
          components: createPlayerButtons(true)
        });
        break;

      case 'resume':
        if (!queue) {
          return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
        }
        queue.node.resume();
        await interaction.update({
          embeds: [createNowPlayingEmbed(queue.currentTrack, queue)],
          components: createPlayerButtons(false)
        });
        break;

      case 'skip':
        if (!queue || !queue.isPlaying()) {
          return interaction.reply({ content: '❌ Нечего пропускать', ephemeral: true });
        }
        const skippedTrack = queue.currentTrack;
        queue.node.skip();
        await interaction.reply({ content: `⏭️ Пропущено: **${skippedTrack.title}**`, ephemeral: true });
        break;

      case 'prev':
        if (!queue) {
          return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
        }
        if (queue.history.isEmpty()) {
          return interaction.reply({ content: '❌ История пуста', ephemeral: true });
        }
        await queue.history.back();
        await interaction.reply({ content: '⏮️ Предыдущий трек', ephemeral: true });
        break;

      case 'stop':
        if (!queue) {
          return interaction.reply({ content: '❌ Уже остановлено', ephemeral: true });
        }
        queue.delete();
        await interaction.update({
          embeds: [new EmbedBuilder().setColor(0xef4444).setDescription('⏹️ Воспроизведение остановлено')],
          components: []
        });
        break;

      case 'shuffle':
        if (!queue || queue.tracks.size < 2) {
          return interaction.reply({ content: '❌ Мало треков для перемешивания', ephemeral: true });
        }
        queue.tracks.shuffle();
        await interaction.reply({ content: '🔀 Очередь перемешана!', ephemeral: true });
        break;

      case 'loop':
        if (!queue) {
          return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
        }
        const modes = [0, 1, 2]; // Off, Track, Queue
        const currentMode = queue.repeatMode;
        const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
        queue.setRepeatMode(nextMode);
        const modeNames = { 0: 'Выключен', 1: 'Трек', 2: 'Очередь' };
        await interaction.reply({ content: `🔁 Повтор: **${modeNames[nextMode]}**`, ephemeral: true });
        break;

      case 'queue':
        if (!queue || queue.tracks.size === 0) {
          return interaction.reply({ content: '📭 Очередь пуста', ephemeral: true });
        }
        const tracks = queue.tracks.map((t, i) => `**${i + 1}.** ${t.title} — \`${t.duration}\``).slice(0, 10);
        const queueEmbed = new EmbedBuilder()
          .setColor(0x0ea5e9)
          .setTitle('📋 Очередь воспроизведения')
          .setDescription(tracks.join('\n'))
          .setFooter({ text: `Всего: ${queue.tracks.size} треков` });
        await interaction.reply({ embeds: [queueEmbed], ephemeral: true });
        break;

      case 'vol_down':
        if (!queue) {
          return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
        }
        const newVolDown = Math.max(0, queue.node.volume - 10);
        queue.node.setVolume(newVolDown);
        await interaction.reply({ content: `🔉 Громкость: **${newVolDown}%**`, ephemeral: true });
        break;

      case 'vol_up':
        if (!queue) {
          return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
        }
        const newVolUp = Math.min(100, queue.node.volume + 10);
        queue.node.setVolume(newVolUp);
        await interaction.reply({ content: `🔊 Громкость: **${newVolUp}%**`, ephemeral: true });
        break;
    }
  } catch (error) {
    console.error('Button error:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Произошла ошибка', ephemeral: true });
    }
  }
});

// ═══════════════════════════════════════
// SLASH КОМАНДЫ
// ═══════════════════════════════════════

client.commands = new Collection();

// /play
client.commands.set('play', {
  async execute(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel) {
      return interaction.reply({ content: '❌ Зайди в голосовой канал!', ephemeral: true });
    }

    const query = interaction.options.getString('query', true);
    await interaction.deferReply();

    try {
      const player = useMainPlayer();
      const { track, searchResult } = await player.play(channel, query, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            requestedBy: interaction.user
          },
          volume: 50,
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 60000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 60000,
        },
        requestedBy: interaction.user
      });

      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('✅ Добавлено в очередь')
        .setDescription(`**${track.title}**\n${track.author}`)
        .setThumbnail(track.thumbnail)
        .addFields(
          { name: '⏱️ Длительность', value: track.duration, inline: true },
          { name: '🎵 Источник', value: track.source || 'Неизвестно', inline: true }
        )
        .setFooter({ text: `Запросил: ${interaction.user.username}` });

      if (searchResult.playlist) {
        embed.setTitle(`✅ Добавлен плейлист: ${searchResult.playlist.title}`);
        embed.setDescription(`Добавлено **${searchResult.tracks.length}** треков`);
      }

      return interaction.followUp({ embeds: [embed] });
    } catch (e) {
      console.error('Play error:', e);
      return interaction.followUp({ content: `❌ Ошибка: ${e.message}` });
    }
  },
});

// /skip
client.commands.set('skip', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying()) {
      return interaction.reply({ content: '❌ Ничего не играет', ephemeral: true });
    }
    const current = queue.currentTrack;
    queue.node.skip();
    return interaction.reply({ content: `⏭️ Пропущено: **${current.title}**` });
  },
});

// /stop
client.commands.set('stop', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
    }
    queue.delete();
    return interaction.reply({ content: '⏹️ Воспроизведение остановлено' });
  },
});

// /pause
client.commands.set('pause', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying()) {
      return interaction.reply({ content: '❌ Ничего не играет', ephemeral: true });
    }
    queue.node.pause();
    return interaction.reply({ content: '⏸️ Пауза' });
  },
});

// /resume
client.commands.set('resume', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
    }
    queue.node.resume();
    return interaction.reply({ content: '▶️ Продолжено' });
  },
});

// /queue
client.commands.set('queue', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || queue.tracks.size === 0) {
      return interaction.reply({ content: '📭 Очередь пуста', ephemeral: true });
    }
    const tracks = queue.tracks.map((t, i) => `**${i + 1}.** ${t.title} — \`${t.duration}\``).slice(0, 15);
    const current = queue.currentTrack;

    const embed = new EmbedBuilder()
      .setColor(0x0ea5e9)
      .setTitle('📋 Очередь')
      .setDescription(`**Сейчас:** ${current.title}\n\n${tracks.join('\n')}`)
      .setFooter({ text: `Всего: ${queue.tracks.size} треков` });

    return interaction.reply({ embeds: [embed] });
  },
});

// /np
client.commands.set('np', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Ничего не играет', ephemeral: true });
    }
    
    const embed = createNowPlayingEmbed(queue.currentTrack, queue);
    const buttons = createPlayerButtons(queue.node.isPaused());
    
    return interaction.reply({ embeds: [embed], components: buttons });
  },
});

// /volume
client.commands.set('volume', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
    }
    const level = interaction.options.getInteger('level', true);
    queue.node.setVolume(level);
    return interaction.reply({ content: `🔊 Громкость: **${level}%**` });
  },
});

// /shuffle
client.commands.set('shuffle', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || queue.tracks.size < 2) {
      return interaction.reply({ content: '❌ Мало треков', ephemeral: true });
    }
    queue.tracks.shuffle();
    return interaction.reply({ content: '🔀 Очередь перемешана!' });
  },
});

// /loop
client.commands.set('loop', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
    }
    const mode = interaction.options.getString('mode', true);
    const modes = { 'off': 0, 'track': 1, 'queue': 2 };
    queue.setRepeatMode(modes[mode]);
    const names = { 'off': 'Выключен', 'track': 'Трек', 'queue': 'Очередь' };
    return interaction.reply({ content: `🔁 Повтор: **${names[mode]}**` });
  },
});

// /clear
client.commands.set('clear', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
    }
    queue.tracks.clear();
    return interaction.reply({ content: '🗑️ Очередь очищена (текущий трек продолжает играть)' });
  },
});

// /jump
client.commands.set('jump', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      return interaction.reply({ content: '❌ Очередь пуста', ephemeral: true });
    }
    const position = interaction.options.getInteger('position', true);
    if (position < 1 || position > queue.tracks.size) {
      return interaction.reply({ content: `❌ Укажи число от 1 до ${queue.tracks.size}`, ephemeral: true });
    }
    queue.node.skipTo(position - 1);
    return interaction.reply({ content: `⏭️ Переход к треку #${position}` });
  },
});

// /seek
client.commands.set('seek', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying()) {
      return interaction.reply({ content: '❌ Ничего не играет', ephemeral: true });
    }
    const seconds = interaction.options.getInteger('seconds', true);
    await queue.node.seek(seconds * 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return interaction.reply({ content: `⏩ Перемотка на ${mins}:${secs.toString().padStart(2, '0')}` });
  },
});

// /lyrics — поиск текста
client.commands.set('lyrics', {
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    let query = interaction.options.getString('query');
    
    if (!query && queue?.currentTrack) {
      query = `${queue.currentTrack.title} ${queue.currentTrack.author}`;
    }
    
    if (!query) {
      return interaction.reply({ content: '❌ Укажи название песни или включи музыку', ephemeral: true });
    }

    await interaction.deferReply();
    
    try {
      const player = useMainPlayer();
      const results = await player.lyrics.search({ q: query });
      
      if (!results || results.length === 0) {
        return interaction.followUp({ content: '❌ Текст не найден' });
      }

      const lyrics = results[0];
      const text = lyrics.plainLyrics?.slice(0, 4000) || 'Текст недоступен';

      const embed = new EmbedBuilder()
        .setColor(0x0ea5e9)
        .setTitle(`📝 ${lyrics.trackName}`)
        .setDescription(text)
        .setFooter({ text: `Исполнитель: ${lyrics.artistName}` });

      return interaction.followUp({ embeds: [embed] });
    } catch (e) {
      return interaction.followUp({ content: '❌ Ошибка поиска текста' });
    }
  },
});

// ═══════════════════════════════════════
// СОБЫТИЯ ПЛЕЕРА
// ═══════════════════════════════════════

player.events.on('playerStart', (queue, track) => {
  const embed = createNowPlayingEmbed(track, queue);
  const buttons = createPlayerButtons(false);
  
  queue.metadata.channel.send({ embeds: [embed], components: buttons });
});

player.events.on('audioTrackAdd', (queue, track) => {
  // Не отправляем если это первый трек (он покажется в playerStart)
  if (queue.tracks.size === 0) return;
  
  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setDescription(`➕ В очередь: **${track.title}**`)
    .setFooter({ text: `Позиция: #${queue.tracks.size}` });
  
  queue.metadata.channel.send({ embeds: [embed] });
});

player.events.on('emptyQueue', (queue) => {
  const embed = new EmbedBuilder()
    .setColor(0x64748b)
    .setDescription('📭 Очередь закончилась');
  
  queue.metadata.channel.send({ embeds: [embed] });
});

player.events.on('emptyChannel', (queue) => {
  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setDescription('👋 Все ушли из канала — отключаюсь');
  
  queue.metadata.channel.send({ embeds: [embed] });
});

player.events.on('error', (queue, error) => {
  console.error(`[${queue.guild.name}] Ошибка:`, error);
});

player.events.on('playerError', (queue, error) => {
  console.error(`[${queue.guild.name}] Player error:`, error);
  
  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setDescription(`❌ Ошибка воспроизведения: ${error.message}`);
  
  queue.metadata.channel.send({ embeds: [embed] });
});

// ═══════════════════════════════════════
// ОБРАБОТКА SLASH КОМАНД
// ═══════════════════════════════════════

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Command error:', error);
    const reply = { content: '❌ Произошла ошибка', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// ═══════════════════════════════════════
// ЗАПУСК
// ═══════════════════════════════════════

client.once(Events.ClientReady, (c) => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║     🎵 SoundForge Music Bot 🎵         ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Бот: ${c.user.tag.padEnd(31)}║`);
  console.log(`║  Серверов: ${String(c.guilds.cache.size).padEnd(27)}║`);
  console.log(`║  Команд: 12                            ║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  // Статус бота
  c.user.setActivity('музыку | /play', { type: ActivityType.Listening });
});

client.login(process.env.DISCORD_TOKEN);
