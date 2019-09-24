import WizardScene from 'telegraf/scenes/wizard/index.js';
import axios from 'axios';
import { STATS_WIZARD } from '../core/strings.js';
import {
  getPreviousSunday,
  WHITESPACE_SEPARATED_NUMBERS_REGEX,
  WHITESPACE_REGEX,
  NUMBER_REGEX
} from '../core/util.js';
import { deriveRecordsUrl } from '../core/statsApi.js';

export const STATS_WIZARD_NAME = 'stats-wizard';

const statsWizard = new WizardScene(STATS_WIZARD_NAME,
  async ctx => {
    try {
      const response = await axios.get(deriveRecordsUrl(ctx.state.ubtsUserId), {
        params: { date: getPreviousSunday() }
      });
      if (response.data.length) {
        ctx.reply(STATS_WIZARD.DATA_ALREADY_SAVED);
        return ctx.scene.leave();
      }
    } catch (error) {
      console.error(error);
      ctx.reply(STATS_WIZARD.BACKEND_QUERY_ERROR);
      return ctx.scene.leave();
    }
    ctx.reply(STATS_WIZARD.PRAYER_QUESTION);
    return ctx.wizard.next();
  },
  ctx => {
    const text = ctx.message.text;
    if (!WHITESPACE_SEPARATED_NUMBERS_REGEX.test(text)) {
      return ctx.reply(STATS_WIZARD.INCORRECT_DATA_FORMAT);
    }
    const numberArray = text.split(WHITESPACE_REGEX);
    ctx.wizard.state.prayerMinutes = +numberArray[0] * 60 + +numberArray[1];
    ctx.reply(STATS_WIZARD.WITNESSES_QUESTION);
    return ctx.wizard.next();
  },
  async ctx => {
    const text = ctx.message.text;
    if (!NUMBER_REGEX.test(text)) {
      return ctx.reply(STATS_WIZARD.INCORRECT_DATA_FORMAT);
    }
    const stats = {
      prayerMinutes: ctx.wizard.state.prayerMinutes,
      christWitnesses: +text,
      date: getPreviousSunday()
    };
    try {
      await axios.post(deriveRecordsUrl(ctx.state.ubtsUserId), stats);
      ctx.reply(STATS_WIZARD.DATA_SAVE_SUCCESS);
    } catch (error) {
      console.error(error);
      ctx.reply(STATS_WIZARD.DATA_SAVE_ERROR);
    }
    return ctx.scene.leave();
  }
);

export default statsWizard;
