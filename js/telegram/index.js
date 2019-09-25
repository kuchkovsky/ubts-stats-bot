import { createReadStream } from 'fs';
import Telegraf from 'telegraf';
import session from 'telegraf/session.js';
import Stage from 'telegraf/stage.js';
import axios from 'axios';
import schedule from 'node-schedule';
import { START, INTERCEPTER, SCHEDULER, STATS_WIZARD } from '../core/strings.js';
import {
  derivePhoneUrl,
  deriveMessengerIdsUrl,
  deriveUserByTelegramIdUrl,
  LDAP_USERS,
  ALL_RECORDS
} from '../core/statsApi.js';
import statsWizard, { STATS_WIZARD_NAME } from './stats-wizard.js';
import { ROZBIYNYK_IMG_PATH, getPreviousSunday } from '../core/util.js';

const userMap = {};

const bot = new Telegraf(process.env.UBTS_STATS_TELEGRAM_BOT_TOKEN);

bot.start(ctx => {
  const openPhoneKeyboard = {
    reply_markup: {
      keyboard: [[{ text: START.SEND_PHONE_LABEL, request_contact: true }]]
    }
  };
  ctx.reply(START.GREETING(ctx.from.first_name))
   .then(() => ctx.reply(START.SEND_PHONE_REQUEST, openPhoneKeyboard));
});

bot.on('contact', ctx => {
  const phone = ctx.message.contact.phone_number.replace('+', '');
  axios.get(derivePhoneUrl(phone))
    .then(response => {
      const removeKeyboard = { reply_markup: { remove_keyboard: true } };
      if (response.data.length) {
        const user = response.data[0];
        const chatId = ctx.message.chat.id;
        axios.post(deriveMessengerIdsUrl(user.id), { telegram: chatId })
          .then(() => {
            userMap[chatId] = user.id;
            ctx.reply(START.PHONE_ADD_SUCCESS, removeKeyboard)
              .then(() => ctx.reply(START.SEND_STATS_HINT));
          });
      } else {
        ctx.reply(START.PHONE_NOT_FOUND)
          .then(() => ctx
            .replyWithPhoto({ source: createReadStream(ROZBIYNYK_IMG_PATH) }, removeKeyboard));
      }
    });
});

bot.use(async (ctx, next) => {
  if (ctx.message) {
    const chatId = ctx.message.chat.id;
    if (!userMap[chatId]) {
      try {
        const response = await axios.get(deriveUserByTelegramIdUrl(chatId));
        userMap[chatId] = response.data.id;
      } catch (error) {
        await ctx.reply(INTERCEPTER.NOT_AUTHORIZED);
        return ctx.replyWithPhoto({ source: createReadStream(ROZBIYNYK_IMG_PATH) });
      }
    }
    ctx.state.ubtsUserId = userMap[chatId];
  }
  return next(ctx);
});

const stage = new Stage([statsWizard]);
stage.command('cancel', ctx => {
  ctx.reply(STATS_WIZARD.DATA_INPUT_CANCELED);
  ctx.scene.leave();
});

bot.use(session());
bot.use(stage.middleware());

bot.command('send_stats', ctx => ctx.scene.enter(STATS_WIZARD_NAME));

schedule.scheduleJob('0 14 * * *', async () => {
  try {
    const ldapUsersResponse = await axios.get(LDAP_USERS);
    const previousWeekRecordsResponse = await axios.get(ALL_RECORDS, {
      params: { date: getPreviousSunday() }
    });
    const telegramUsersMailingList = ldapUsersResponse.data
      .filter(user => user.telegramId
        && !previousWeekRecordsResponse.data.some(record => record.userId === user.id));
    telegramUsersMailingList
      .forEach(user => bot.telegram.sendMessage(user.telegramId, SCHEDULER.STATS_REMINDER)
        .catch(error => {
          const message = 'Failed to send message for user with '
            + `id=${user.id}, chatId=${user.telegramId}. Details: `;
          console.error(message, error.response);
          if (error.response.description.includes('chat not found')) {
            axios.post(deriveMessengerIdsUrl(user.id), { telegram: null })
              .then(() => {
                console.log(`Successfully deleted no longer used chatId=${user.telegramId}`);
              })
              .catch(e => console.error(e));
          }
        }));
  } catch (error) {
    console.error(error);
  }
});

bot.on('text', ctx => ctx.reply('Ку 👋'));
bot.on('sticker', ctx => ctx.reply('👍'));

bot.launch();
